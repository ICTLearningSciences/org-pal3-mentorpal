import React, { useEffect } from "react"
import { useDispatch } from 'react-redux';
import { graphql } from "gatsby"

import { loadMentor, selectMentor } from '../redux/actions'

import Header from '../components/header'
import Input from '../components/input'
import Layout from "../components/layout"
import Video from "../components/video"
import VideoPanel from '../components/video-panel'

const IndexPage = ({ ...props }) => {
  const dispatch = useDispatch()

  useEffect(() => {
    const data = props.data.allMentorsCsv.edges
    data.forEach(item => {
      dispatch(loadMentor(item.node))
    });
    dispatch(selectMentor(data[0].node.id))
  })

  return (
    <Layout>
      <VideoPanel />
      <Header />
      <Video />
      <Input />
    </Layout>
  )
}

export default IndexPage;

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