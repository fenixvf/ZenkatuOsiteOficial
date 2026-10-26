# Fontes embutidas

Fonte **Montserrat** (Regular e Bold), usada para desenhar o texto do card de
compartilhamento (`/api/share/:slug/image`). Ambientes serverless como a
Vercel não têm fontes instaladas, então elas são empacotadas na function e
gravadas em `/tmp` na inicialização (ver `installBundledFonts` em
`src/lib/share-card.ts`).

- Licença: SIL Open Font License 1.1
- Origem: https://github.com/JulietaUla/Montserrat (`fonts/ttf/Montserrat-*.ttf`)
- Foram subsetadas com `fonttools` para os caracteres latinos + acentos do
  pt-BR (`U+0020-00FF`, `U+2000-206F`, `U+20AC`, `U+2122`), o que reduziu de
  ~450 KB para ~48 KB cada.

Para regenerar a partir dos TTFs originais:

```bash
python3 -m fontTools.subset Montserrat-Regular.ttf \
  --unicodes="U+0020-00FF,U+0131,U+0152-0153,U+2000-206F,U+20AC,U+2122" \
  --output-file=Montserrat-Regular.ttf --layout-features='kern,liga,locl'
```
