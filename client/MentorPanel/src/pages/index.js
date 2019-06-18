import React, { useEffect } from "react"
import { useDispatch } from 'react-redux'
import { graphql } from "gatsby"

import { loadMentor, selectMentor } from '../redux/actions'

import Header from '../components/header'
import Input from '../components/input'
import Video from '../components/video'
import VideoPanel from '../components/video-panel'
import Topics from '../components/topics'
import Questions from '../components/questions'
import "../styles/layout.css"

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
    <div className='flex'>
      <div className='content'>
        <VideoPanel />
        <Header />
        <Video />
        <Topics />
      </div>
      <div className='expand' id='question-container'>
        <Questions />
      </div>
      <div className='footer'>
        <Input />
      </div>
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