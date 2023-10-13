/**
 * @NAPIVersion 2.x
 * @NModuleScope public
 */



import {EntryPoints} from 'N/types'
import * as log from 'N/log'
import * as UI from 'N/ui/serverWidget'
import { constantes  as CTS} from '../module/jtc_liquidacao_boleto_CTS'
import * as file from "N/file"
import * as task from 'N/task'
import * as record from 'N/record'
import * as redirect from 'N/redirect'
import * as search from 'N/search'

export const onRequest = (ctx: EntryPoints.Suitelet.onRequestContext) => {
    try {
        const form = UI.createForm({
            title: CTS.FORM.TITLE
        })
        
        if (ctx.request.method == "GET") {
            getFormToUploadCSV(form, ctx)
        } else {
            const liquidar = ctx.request.parameters.custpage_liquidar

            if (liquidar == true || liquidar == "T") {
                
                startMapReduceToMakePayment(ctx)
            } else {
                conciliacaoBankXNetsuite(form, ctx)
            }

        }

    } catch (error) {
        log.error("jtc_liquidacao_boleto_form_MSR.onRequest", error)
        throw error
    }
}


const getFormToUploadCSV = (form: UI.Form, ctx: EntryPoints.Suitelet.onRequestContext) => {
    try {
        form.addField({
            id: CTS.FORM.LIQUIDAR.ID,
            label: CTS.FORM.LIQUIDAR.LABEL,
            type: UI.FieldType.CHECKBOX
        })

        form.addField({
            id: CTS.FORM.LOAD_FILE.ID,
            label: CTS.FORM.LOAD_FILE.LABEL,
            type: UI.FieldType.FILE
        })

        

        form.addSubmitButton({
            label: 'Enviar'
        })

        ctx.response.writePage(form)

    } catch (error) {
        log.error("jtc_liquidacao_boleto_form_MSR.formToUploadCSV",error)
    }
}


const startMapReduceToMakePayment = (ctx: EntryPoints.Suitelet.onRequestContext) => {
    try {
        const form_file: file.File = ctx.request.files.custpage_load_file
        
        form_file.folder = 68332

        const idFile = form_file.save()

        const boletosFiles =  file.load({id: idFile}).getContents()

        log.debug("boletos", boletosFiles)


        const recLiquidcaoLote = record.create({
            type: CTS.RT_LIQUIDACAO_LOTE.ID
        })

        recLiquidcaoLote.setValue({fieldId: CTS.RT_LIQUIDACAO_LOTE.DT_INICIO, value: new Date()})

        recLiquidcaoLote.setValue({fieldId: CTS.RT_LIQUIDACAO_LOTE.STATUS, value: "Iniciado"})

        const idRec = recLiquidcaoLote.save()

        const startMapReduce = task.create({
            taskType: task.TaskType.MAP_REDUCE
        })
        const scriptId:  string | any = CTS.SCRIPT_LIQUIDAR_BOLETO.ID
        startMapReduce.scriptId = scriptId

        startMapReduce.params = {
            custscript_jtc_id_file_csv_liquidar: idFile,
            custscript_id_red_lote_liquidacao: idRec
        }

        startMapReduce.submit()

        redirect.toRecord({
            type: CTS.RT_LIQUIDACAO_LOTE.ID,
            id: idRec
        })

    } catch (error) {
        log.error("jtc_liquidacao_boleto_form_MSR.startMapReduceToMakePayment", error)
    }
}


const conciliacaoBankXNetsuite = (form: UI.Form, ctx: EntryPoints.Suitelet.onRequestContext) => {
    try {
        const form_file: file.File = ctx.request.files.custpage_load_file
        
        form_file.folder = 68332

        const idFile = form_file.save()

        const boletosFiles =  file.load({id: idFile}).getContents()


        // **************** create sublist
        const idSublist = CTS.FORM.SUBLIST.ID
        const sublist = form.addSublist({
            id: idSublist,
            label: CTS.FORM.SUBLIST.LABEL,
            type: UI.SublistType.LIST
        })

        sublist.addField({
            id: CTS.FORM.SUBLIST.NOSS_NUM.ID,
            label: CTS.FORM.SUBLIST.NOSS_NUM.LABEL,
            type: UI.FieldType.TEXT
        })
        sublist.addField({
            id: CTS.FORM.SUBLIST.INVOICE.ID,
            label: CTS.FORM.SUBLIST.INVOICE.LABEL,
            type: UI.FieldType.SELECT,
            source: 'invoice'
        })
        sublist.addField({
            id: CTS.FORM.SUBLIST.STATUS_BANCO.ID,
            label: CTS.FORM.SUBLIST.STATUS_BANCO.LABEL,
            type: UI.FieldType.TEXT
        })
        sublist.addField({
            id: CTS.FORM.SUBLIST.STATUS_NET.ID,
            label: CTS.FORM.SUBLIST.STATUS_NET.LABEL,
            type: UI.FieldType.TEXT
        })



        let line = 0
        const content = String(boletosFiles).split("\n").forEach((value, index )=> {
            const v = value.split(",")
            const nossoNUm = v[5]
            log.debug("nossoNUm", nossoNUm)

            const searchCnabParcela = search.create({
                type: CTS.RT_CNAB_PARCELA.ID,
                filters: [
                    [CTS.RT_CNAB_PARCELA.NOSSO_NUM, search.Operator.HASKEYWORDS, String(nossoNUm)]
                ],
                columns: [
                    search.createColumn({name: CTS.RT_CNAB_PARCELA.TRANSACTION}),
                    search.createColumn({name: CTS.RT_CNAB_PARCELA.NOSSO_NUM}),
                    search.createColumn({name: CTS.RT_CNAB_PARCELA.NUM_PARCELA}),
                    search.createColumn({name: CTS.RT_CNAB_PARCELA.CONVENIO}),
                    search.createColumn({name: "custrecord_jtc_int_boleto_pago"})
                    
                    
                ]
            }).run().getRange({start: 0, end: 1})
            log.debug("searhc", searchCnabParcela)
            if (searchCnabParcela.length > 0) {

                sublist.setSublistValue({
                    id: CTS.FORM.SUBLIST.INVOICE.ID,
                    line: line,
                    value: !!String(searchCnabParcela[0].getValue({name: CTS.RT_CNAB_PARCELA.TRANSACTION}))  ? String(searchCnabParcela[0].getValue({name: CTS.RT_CNAB_PARCELA.TRANSACTION})) : 'NONE'
                })
    
                sublist.setSublistValue({
                    id: CTS.FORM.SUBLIST.NOSS_NUM.ID,
                    line: line,
                    value: String(searchCnabParcela[0].getValue({name: CTS.RT_CNAB_PARCELA.NOSSO_NUM}))
                })
    
                const status = searchCnabParcela[0].getValue({name : 'custrecord_jtc_int_boleto_pago'})
                let s
                if (status == "F" || status == false) {
                    s = "Em Aberto"
                } else {
                    s = "Liquidado"
                }
    
                sublist.setSublistValue({
                    id: CTS.FORM.SUBLIST.STATUS_BANCO.ID,
                    line: line,
                    value: "Liquidado"
                })
                sublist.setSublistValue({
                    id: CTS.FORM.SUBLIST.STATUS_NET.ID,
                    line: line,
                    value: s
                })     

                line += 1
            }
         
           
        })

        ctx.response.writePage(form)

    } catch (error) {
        log.error("jtc_liquidar_boleto_form_MSR.conciliacaoBankXNetsuite", error)
    }
}