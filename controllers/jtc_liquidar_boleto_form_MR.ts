/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 */

import { EntryPoints } from "N/types"
import * as log from 'N/log'
import * as MSR from '../models/jtc_liquidar_boletos_MSR'

export const getInputData: EntryPoints.MapReduce.getInputData = () => {
    try {
        return MSR.getInputData()
    } catch (e) {
        log.error("jtc_liquidar_boleto_form_MR.getInputData", e)
    }
}

export const map: EntryPoints.MapReduce.map = (ctx: EntryPoints.MapReduce.mapContext) => {
    try {
        MSR.map(ctx)
    } catch (e) {
        log.error("jtc_liquidar_boleto_form_MR.map", e)
    }
}

export const summarize: EntryPoints.MapReduce.summarize = (ctx: EntryPoints.MapReduce.summarizeContext) => {
    try {
        MSR.summarize(ctx)
    } catch (e) {
        log.error("jtc_liquidar_boleto_form_MR.summarize", e)
    }
}