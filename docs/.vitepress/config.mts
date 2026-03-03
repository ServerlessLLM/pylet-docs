import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'PyLet',
  description: 'A simple distributed task execution system for GPU servers',
  base: '/pylet.github.io/',
  
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/pylet.github.io/logo.svg' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/getting-started/quickstart' },
      { text: 'Reference', link: '/reference/cli' },
      { text: 'PyPI', link: 'https://pypi.org/project/pylet/' },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Quick Start', link: '/getting-started/quickstart' },
        ],
      },
      {
        text: 'Guide',
        items: [
          { text: 'Core Concepts', link: '/guide/concepts' },
          { text: 'Configuration', link: '/guide/configuration' },
          { text: 'Examples', link: '/guide/examples' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'CLI Reference', link: '/reference/cli' },
          { text: 'Python API', link: '/reference/python-api' },
        ],
      },
      {
        text: 'Advanced',
        items: [
          { text: 'Architecture', link: '/advanced/architecture' },
          { text: 'Troubleshooting', link: '/advanced/troubleshooting' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ServerlessLLM/pylet' },
    ],

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/ServerlessLLM/pylet.github.io/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the Apache 2.0 License.',
      copyright: 'Copyright © 2024-present ServerlessLLM',
    },

    outline: {
      level: [2, 3],
    },
  },
})
