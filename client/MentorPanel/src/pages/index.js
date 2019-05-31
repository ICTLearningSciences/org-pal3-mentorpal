import React from "react"
import { graphql } from "gatsby"
import { connect } from 'react-redux';

import { setMentorResponse } from '../redux/actions'

import Layout from "../components/layout"
import Header from '../components/header'
import Input from '../components/input'
import VideoPanel from '../components/video-panel'
import Video from "../components/video"

class IndexPage extends React.Component {

  // Load the initial intro responses for each mentor
  componentDidMount() {
    const data = this.props.data.allMentorsCsv.edges
    data.forEach(item => {
      this.props.dispatch(setMentorResponse(item.node))
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