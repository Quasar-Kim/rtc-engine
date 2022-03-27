const markdownIt = require('markdown-it')
const markdownItAnchor = require('markdown-it-anchor')
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight')
const pluginTOC = require('eleventy-plugin-toc')

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight)
  eleventyConfig.addPlugin(pluginTOC)
  eleventyConfig.addPassthroughCopy('./docs/css/github-markdown.css')
  eleventyConfig.setLibrary(
    'md',
    markdownIt().use(markdownItAnchor)
  )

  return {
    dir: {
      input: 'docu',
      output: 'docs'
    },
    pathPrefix: '/rtc-engine/docs/'
  }
}