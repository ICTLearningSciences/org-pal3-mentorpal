import React, { useEffect } from "react"
import { useDispatch } from 'react-redux'
import { graphql } from "gatsby"

import { loadMentor, selectMentor } from 'src/redux/actions'

import Header from 'src/components/header'
import Input from 'src/components/input'
import Video from 'src/components/video'
import VideoPanel from 'src/components/video-panel'

import "src/styles/layout.css"

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
    <div>
      <div id='player'>
        <VideoPanel />
        <Header />
        <Video />
      </div>
      <Input />
    </div>
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