import React, { useEffect } from "react"
import { useDispatch } from 'react-redux'
import { graphql } from "gatsby"
import { Paper } from '@material-ui/core';

import { loadMentor, loadQuestions, selectMentor } from 'src/redux/actions'

import Header from 'src/components/header'
import Input from 'src/components/input'
import Questions from 'src/components/questions'
import Topics from 'src/components/topics'
import Video from 'src/components/video'
import VideoPanel from 'src/components/video-panel'
import withLocation from 'src/wrap-with-location'

import "src/styles/layout.css"

const IndexPage = ({ search, ...props }) => {
  const dispatch = useDispatch()
  const { recommended } = search

  useEffect(() => {
    const data = props.data.allMentorsCsv.edges
    data.forEach(item => {
      dispatch(loadMentor(item.node))
      dispatch(loadQuestions(item.node.id, recommended))
    });
    dispatch(selectMentor(data[0].node.id))
  })

  return (
    <div>
      <div className='flex' style={{ height: window.innerHeight * 0.5 }}>
        <div className='content' style={{ height: '90px' }}>
          <VideoPanel />
          <Header />
        </div>
        <div className='expand'>
          <Video />
        </div>
      </div>

      <Input />
    </div>
  )
}

export default withLocation(IndexPage)

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