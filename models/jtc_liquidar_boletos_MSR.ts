/**
 * @NAPIVersion 2.x
 * @NModuleScope public
 */



import { EntryPoints } from "N/types"
import * as runtime from 'N/runtime'
import * as log from 'N/log'
import * as file from 'N/file'
import * as search from 'N/search'
import * as record from "N/record"
import { constantes as CTS } from "../module/jtc_liquidacao_boleto_CTS"
import * as https from 'N/https'

export const getInputData = () => {
    try {
        const currScript = runtime.getCurrentScript()
        const idFile: string | number | any = currScript.getParameter({name: CTS.SCRIPT_LIQUIDAR_BOLETO.ID_FILE})
        const idRec = currScript.getParameter({name: CTS.SCRIPT_LIQUIDAR_BOLETO.ID_REC_LOTE})

        const file_csv = file.load({id: idFile})

        const response = []
        const content = String(file_csv.getContents()).split("\n").forEach( value => {
            // log.debug("conte", value)
            const v = value.split(";")
            const nossoNUm = v[5]
            // response.nossoNumero.push(nossoNUm)

            const searchCnabParcela = search.create({
                type: CTS.RT_CNAB_PARCELA.ID,
                filters: [
                    [CTS.RT_CNAB_PARCELA.NOSSO_NUM, search.Operator.HASKEYWORDS, String(nossoNUm)],
                    "AND",
                    ["custrecord_jtc_int_boleto_pago", search.Operator.IS, "F"]
                ]
                ,
                columns: [
                    search.createColumn({name: CTS.RT_CNAB_PARCELA.TRANSACTION}),
                    search.createColumn({name: CTS.RT_CNAB_PARCELA.NOSSO_NUM}),
                    search.createColumn({name: CTS.RT_CNAB_PARCELA.NUM_PARCELA}),
                    search.createColumn({name: CTS.RT_CNAB_PARCELA.CONVENIO})
                    
                    
                ]
            }).run().getRange({start: 0, end: 1})
            // log.debug("search", searchCnabParcela)
            if (searchCnabParcela.length > 0) {
                response.push(searchCnabParcela)
            }
        })

        return response

    } catch (e) {
        log.error("jtc_liquidar_boletos_MSR.getInputData", e)
    }
}

export const map = (ctx: EntryPoints.MapReduce.mapContext) => {
    try {
        const data = getIntergrcaoBB()
        const token = getAccessToken(data.url_token, data.authorization)


        const values = JSON.parse(ctx.value)

        log.debug("Values", values)
        
        const idCnabParcela = Number(values[0].id)
        // log.debug("idCanb", idCnabParcela)
        const idTransaction = values[0].values.custrecord_dk_cnab_transacao[0].value
        const nossoNUm = values[0].values.custrecord_dk_cnab_nosso_numero
        const numConverio = values[0].values.custrecord_dk_cnab_numero_convenio
        const num_parcela = String(values[0].values.custrecord_dk_cnab_seq_parcela).split(" ")[1].split("_")[0]

        log.debug(num_parcela, idTransaction)

        // ******************* REQUEST BOLETO **********************
        const urlBoletoIndividual = `https://api.bb.com.br/cobrancas/v2/boletos/${nossoNUm}?gw-dev-app-key=${data.key}&numeroConvenio=${numConverio}`

        // log.debug('urlBoletoIndividual', urlBoletoIndividual)
        const authObj = token.body.token_type + " " + token.body.access_token

        const headerArr = {};
        headerArr['Authorization'] = authObj;
        headerArr['Accept'] = 'application/json';

        const responseBoletoIndivudual = JSON.parse(https.get({
            url: urlBoletoIndividual,
            headers: headerArr
        }).body)



        if (!!idTransaction) {
            const custmerPayment = record.transform({
                fromId: idTransaction, 
                fromType: record.Type.INVOICE,
                toType: record.Type.CUSTOMER_PAYMENT
            })

            const subId = custmerPayment.getValue(CTS.COSTUMER_PAYMENT.SUBSIDIARY)
            if (subId == 3) {
                custmerPayment.setValue({fieldId: CTS.COSTUMER_PAYMENT.ACCOUNT, value: 620})
            } else {
                custmerPayment.setValue({fieldId: CTS.COSTUMER_PAYMENT.ACCOUNT_CUSTOM, value: 620})
            }

            const sublistId =  CTS.COSTUMER_PAYMENT.SUB_APPLY.ID
            const lineCount = custmerPayment.getLineCount({sublistId: sublistId})

            const valor_orginal_pagamento = responseBoletoIndivudual.valorOriginalTituloCobranca
            const valor_pagamento_bb = responseBoletoIndivudual.valorPagoSacado

            if (valor_orginal_pagamento != valor_pagamento_bb) {
                custmerPayment.setValue({
                    fieldId: CTS.COSTUMER_PAYMENT.DIFENCA_PAGO,
                    value: valor_pagamento_bb - valor_orginal_pagamento
                })
            }

            custmerPayment.setValue({fieldId: CTS.COSTUMER_PAYMENT.PAYMENT, value: valor_pagamento_bb})
          


            for (var i = 0; i < lineCount; i++) {
                custmerPayment.setSublistValue({
                    sublistId: sublistId,
                    fieldId: CTS.COSTUMER_PAYMENT.SUB_APPLY.APPLY,
                    line: i,
                    value: false
                })

                const idInvoiceFromSublist = custmerPayment.getSublistValue({
                    sublistId: sublistId,
                    fieldId: CTS.COSTUMER_PAYMENT.SUB_APPLY.INVOICE_ID,
                    line: i
                })
                const numInstallmentFromSublist = custmerPayment.getSublistValue({
                    sublistId: sublistId,
                    fieldId: CTS.COSTUMER_PAYMENT.SUB_APPLY.NUM_PARCELA,
                    line: i
                })
                log.debug("idInvoiceFromSublist", idInvoiceFromSublist)
                log.debug("idTransaction", idTransaction)
                log.debug("numInstallmentFromSublist", numInstallmentFromSublist)
                log.debug("num_parcela", num_parcela)

                if (idInvoiceFromSublist == idTransaction && numInstallmentFromSublist == num_parcela) {
                    log.debug("igual e setar", "START")
                    custmerPayment.setSublistValue({
                        sublistId: sublistId,
                        fieldId: CTS.COSTUMER_PAYMENT.SUB_APPLY.APPLY,
                        line: i,
                        value: true
                    })
                    const f = custmerPayment.getSublistValue({
                        sublistId: sublistId,
                        fieldId: CTS.COSTUMER_PAYMENT.SUB_APPLY.APPLY,
                        line: i
                    })
                    log.debug("OK", f)
                }
            }

            const idCostumrPay = custmerPayment.save({ignoreMandatoryFields: true})

            if (!!idCostumrPay) {
                const recParcela = record.load({
                    id: idCnabParcela,
                    type: CTS.RT_CNAB_PARCELA.ID
                })
                recParcela.setValue({fieldId: 'custrecord_jtc_int_boleto_pago', value: true })
                const idRet = recParcela.save()
                log.audit("id Custumer ", idCostumrPay)
                log.audit("id ParcelaCnab ", idRet)
            }
        }

    } catch (error) {
        log.error("jtc_liquidar_boletos_MSR.map", error)
    }
}

export const summarize = (ctx: EntryPoints.MapReduce.summarizeContext) => {
    try {
        const currScript = runtime.getCurrentScript()
        const idRec: any = currScript.getParameter({name: CTS.SCRIPT_LIQUIDAR_BOLETO.ID_REC_LOTE})

        const id = record.submitFields({
            id: idRec,
            type: CTS.RT_LIQUIDACAO_LOTE.ID,
            values: {
                custrecord_jtc_data_finalizado: new Date(),
                custrecord_jtc_status_execucao: 'Finalizado'
            }
        })
        log.debug("id", id)

    } catch (error) {
        log.error("jtc_liquidar_boletos_MSR.summarize", error)
    }
}

const getIntergrcaoBB = () => {
    try{
        const searchIntegracaoBB = search.create({
            type: CTS.INTEGRACAO_BB.ID,
            filters: [],
            columns: [
                search.createColumn({name: CTS.INTEGRACAO_BB.KEY}),
                search.createColumn({name: CTS.INTEGRACAO_BB.URL_TOKEN}),
                search.createColumn({name: CTS.INTEGRACAO_BB.AUTHORIZATION}),
                search.createColumn({name: CTS.INTEGRACAO_BB.CONTA}),
                search.createColumn({name: CTS.INTEGRACAO_BB.AGENCIA})
            ]
        }).run().getRange({start: 0, end: 1});

        if (searchIntegracaoBB.length > 0) {
            return {
                'key': searchIntegracaoBB[0].getValue({name: CTS.INTEGRACAO_BB.KEY}),
                'url_token': searchIntegracaoBB[0].getValue({name: CTS.INTEGRACAO_BB.URL_TOKEN}),
                'authorization': searchIntegracaoBB[0].getValue({name: CTS.INTEGRACAO_BB.AUTHORIZATION}),
            };
        } else {
            throw {
                'msg': 'cadastrar RT INTEGRACAO BB'
            };
        }
    } catch (e) {
        log.error('getIntergrcaoBB',e);
        throw e
    }

}

const getAccessToken = (url_token, authorization) => {
    try {
        
        const urlObj = String(url_token);

        const bodyObj = {
                "grant_type": "client_credentials",
                "scope": "cobrancas.boletos-info cobrancas.boletos-requisicao"
        };

        const authObj = authorization; //* alterado basic pelo de produção;

        const headerArr = {};
        headerArr['Authorization'] = authObj;
        headerArr['Accept'] = 'application/json';

        const response = https.post({
                url: urlObj,
                body: bodyObj,
                headers: headerArr
        });


        return {
            body: JSON.parse(response.body),
        };

    } catch (e) {
            log.error('getAccessToken',e);
    }
}
