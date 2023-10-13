/**
 * @NAPIVersion 2.x
 * @NModuleScope public
 */



export const constantes = {
    FORM: {
        TITLE: 'Carregar Arquivo',
        LOAD_FILE: {
            ID: 'custpage_load_file',
            LABEL: 'Carregar Arquivo'
        },
        LIQUIDAR: {
            ID:'custpage_liquidar',
            LABEL: 'Liquidar'
        },
        SUBLIST: {
            ID: 'custpage_sub',
            LABEL: 'Relatório',
            NOSS_NUM: {ID: 'custpage_noss', LABEL:'Nosso Número'},
            INVOICE: {ID: 'custpage_invoice', LABEL:'Contas A Receber'},
            STATUS_BANCO: {ID: 'custpage_status', LABEL:'Status Banco'},
            STATUS_NET: {ID: 'custpage_status_net', LABEL:'Status Netsuite'},
        }
    },
    RT_LIQUIDACAO_LOTE: {
        ID: 'customrecord_jtc_liquidacao_em_lote',
        DT_INICIO: 'custrecord_jtc_data_inicio',
        DT_FIM: 'custrecord_jtc_data_finalizado',
        STATUS: 'custrecord_jtc_status_execucao'
    },

    SCRIPT_LIQUIDAR_BOLETO: {
        ID: 1636,
        ID_FILE: 'custscript_jtc_id_file_csv_liquidar',
        ID_REC_LOTE: 'custscript_id_red_lote_liquidacao'
    },
    RT_CNAB_PARCELA: {
        ID: 'customrecord_dk_cnab_aux_parcela',
        NOSSO_NUM: 'custrecord_dk_cnab_nosso_numero',
        TRANSACTION :'custrecord_dk_cnab_transacao',
        NUM_PARCELA: 'custrecord_dk_cnab_seq_parcela',
        CONVENIO: 'custrecord_dk_cnab_numero_convenio'
    },

    COSTUMER_PAYMENT: {
        SUBSIDIARY: 'subsidiary',
        ACCOUNT: 'account',
        ACCOUNT_CUSTOM: 'custbody_jtc_cont_banc_inter',
        DIFENCA_PAGO:'custbody_jtc_int_dif_valor_org_pago',
        PAYMENT: 'payment',
        // TRANDATE: ''
        SUB_APPLY: {
            ID: 'apply',
            APPLY: 'apply',
            NUM_PARCELA: 'installmentnumber',
            INVOICE_ID: 'doc'
        }
    },
    INTEGRACAO_BB:{
        ID: 'customrecord_jtc_rt_integracao_bb',
        KEY: 'custrecord_jtc_int_bb_key',
        URL_TOKEN: 'custrecord_jtc_int_bb_url_token',
        AUTHORIZATION: 'custrecord_jtc_int_bb_authorization',
        CONTA: 'custrecord_jtc_int_bb_conta',
        AGENCIA: 'custrecord_jtc_int_bb_agencia'
    },

}