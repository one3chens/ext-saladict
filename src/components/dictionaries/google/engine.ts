import {
  MachineTranslateResult,
  SearchFunction,
  MachineTranslatePayload,
  GetSrcPageFunction,
  getMachineTranslateTl
} from '../helpers'
import { Google } from '@opentranslate/google'
import { GoogleLanguage } from './config'

let _translator: Google | undefined
const getTranslator = () =>
  (_translator = _translator || new Google({ env: 'ext' }))

export const getSrcPage: GetSrcPageFunction = (text, config, profile) => {
  const domain = profile.dicts.all.google.options.cnfirst ? 'cn' : 'com'
  const lang =
    profile.dicts.all.google.options.tl === 'default'
      ? config.langCode
      : profile.dicts.all.google.options.tl

  return `https://translate.google.${domain}/#auto/${lang}/${text}`
}

export type GoogleResult = MachineTranslateResult<'google'>

export const search: SearchFunction<
  GoogleResult,
  MachineTranslatePayload<GoogleLanguage>
> = async (text, config, profile, payload) => {
  const options = profile.dicts.all.google.options

  const translator = getTranslator()

  const sl = payload.sl || (await translator.detect(text))
  const tl =
    payload.tl || getMachineTranslateTl(sl, profile.dicts.all.google, config)

  if (payload.isPDF && !options.pdfNewline) {
    text = text.replace(/\n+/g, ' ')
  }

  try {
    const result = await translator.translate(text, sl, tl, {
      concurrent: options.concurrent,
      order: options.cnfirst ? ['cn', 'com'] : ['com', 'cn'],
      apiAsFallback: true
    })
    return {
      result: {
        id: 'google',
        sl: result.from,
        tl: result.to,
        langcodes: translator.getSupportLanguages(),
        searchText: result.origin,
        trans: result.trans
      },
      audio: {
        us: result.trans.tts
      }
    }
  } catch (e) {
    return {
      result: {
        id: 'google',
        sl,
        tl,
        langcodes: translator.getSupportLanguages(),
        searchText: { paragraphs: [''] },
        trans: { paragraphs: [''] }
      }
    }
  }
}
