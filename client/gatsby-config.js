module.exports = {
  pathPrefix: `/mentorpanel`,
  siteMetadata: {
    title: `MentorPanel`,
    description: ``,
    author: `@gatsbyjs`,
  },
  plugins: [
    `gatsby-plugin-root-import`,
    `gatsby-plugin-react-helmet`,
    `gatsby-transformer-sharp`,
    `gatsby-transformer-csv`,
    `gatsby-plugin-sharp`,
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `gatsby-starter-default`,
        short_name: `starter`,
        start_url: `/`,
        background_color: `#663399`,
        theme_color: `#663399`,
        display: `minimal-ui`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `data`,
        path: `${__dirname}/src/data/`,
      },
    },
    {
      resolve: `gatsby-plugin-env-variables`,
      options: {
        whitelist: ["MENTOR_API_URL"],
      },
    },
  ],
}
