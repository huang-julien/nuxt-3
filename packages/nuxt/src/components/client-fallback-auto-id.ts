import { createUnplugin } from 'unplugin'
import type { ComponentsOptions } from '@nuxt/schema'
import MagicString from 'magic-string'
import { isAbsolute, relative } from 'pathe'
import { hash } from 'ohash'
import { isVueTemplate } from './helpers'
interface LoaderOptions {
  sourcemap?: boolean
  transform?: ComponentsOptions['transform'],
  rootDir: string
}

export const clientFallbackAutoIdPlugin = createUnplugin((options: LoaderOptions) => {
  const exclude = options.transform?.exclude || []
  const include = options.transform?.include || []

  return {
    name: 'nuxt:client-fallback-auto-id',
    enforce: 'pre',
    transformInclude (id) {
      if (exclude.some(pattern => id.match(pattern))) {
        return false
      }
      if (include.some(pattern => id.match(pattern))) {
        return true
      }
      return isVueTemplate(id)
    },
    transform (code, id) {
      if (!/[cC]lient-?[fF]allback/.test(code)) { return }

      const s = new MagicString(code)
      const relativeID = isAbsolute(id) ? relative(options.rootDir, id) : id
      let count = 0

      s.replace(/<([cC]lient-?[fF]allback)( [^>]*)?>/g, (full, name, attrs) => {
        count++
        if (/ :?uid=/g.test(attrs)) { return full }
        return `<${name} :uid="'${hash(relativeID)}' + JSON.stringify($props) + '${count}'"  ${attrs ?? ''}>`
      })

      if (s.hasChanged()) {
        return {
          code: s.toString(),
          map: options.sourcemap
            ? s.generateMap({ source: id, includeContent: true })
            : undefined
        }
      }
    }
  }
})