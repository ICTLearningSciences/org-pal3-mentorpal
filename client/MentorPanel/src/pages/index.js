import React from "react"
import { graphql } from "gatsby"
import { connect } from 'react-redux';

import { onMentorLoaded } from '../redux/actions'

import Header from '../components/header'
import Input from '../components/input'
import Layout from "../components/layout"
import Video from "../components/video"
import VideoPanel from '../components/video-panel'

class IndexPage extends React.Component {

  // Load the initial list of mentors (with intro responses)
  componentDidMount() {
    const data = this.props.data.allMentorsCsv.edges
    data.forEach(item => {
      this.props.dispatch(onMentorLoaded(item.node))
    });
  }

  render() {
    return (
      <Layout>
        <VideoPanel />
        <Header />
        <Video />
        <Input />
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
          short_name
          title
          answer_id
          answer_text
          confidence
        }
      }
    }
  }
`