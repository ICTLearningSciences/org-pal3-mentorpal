import React from "react"
import { graphql } from "gatsby"
import { connect } from 'react-redux';

import { setMentors } from '../redux/actions'

import Layout from "../components/layout"
import Header from '../components/header'
import VideoPanel from '../components/video-panel'
import Video from "../components/video"

class IndexPage extends React.Component {

  componentDidMount() {
    const data = this.props.data.allMentorsCsv.edges
    const mentors = data.map(item => { return item.node })
    this.props.dispatch(setMentors(mentors))
  }

  render() {
    return (
      <Layout>
        <VideoPanel />
        <Header />
        <Video />
      </Layout>
    )
  }
}

export default connect()(IndexPage);

export const MentorQuery = graphql`
  query {
    allMentorsCsv {
      edges {
        node {
          id
          name
          shortName
          title
          videoId
        }
      }
    }
  }
`