import { acceptance } from './acceptance.ts'
import { changeOrder } from './change-order.ts'
import { dataProcessing } from './data-processing.ts'
import { nda } from './nda.ts'
import { retainer } from './retainer.ts'
import { services } from './services.ts'
import { sla } from './sla.ts'
import { sow } from './sow.ts'
import type { SeedTemplate } from './vars.ts'

export const CONTRACT_SEEDS: readonly SeedTemplate[] = [services, sow, sla, nda, acceptance, changeOrder, retainer, dataProcessing]
