import { defineConfig } from 'vitepress'

export default defineConfig({
    title: "OpenMandate",
    description: "AI agents that know their boundaries.",
    themeConfig: {
        nav: [
            { text: 'Home', link: '/' },
            { text: 'Docs', link: '/getting-started' },
            { text: 'Builder (Demo)', link: '/builder/' }
        ],

        sidebar: [
            {
                text: 'Guide',
                items: [
                    { text: 'Getting Started', link: '/getting-started' },
                    { text: 'Why OpenMandate?', link: '/why-openmandate' },
                    { text: 'Architecture & Reference', link: '/architecture' },
                    { text: 'Building Skill Packs', link: '/building-skills' },
                    { text: 'Core Skills (Standard Lib)', link: '/core-skills' }
                ]
            }
        ],

        socialLinks: [
            { icon: 'github', link: 'https://github.com/ryanmcdonough/openmandate' }
        ]
    }
})
