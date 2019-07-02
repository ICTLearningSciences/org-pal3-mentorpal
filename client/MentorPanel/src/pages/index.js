import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { graphql } from 'gatsby'
import { CircularProgress } from '@material-ui/core'

import { loadMentor, loadQuestions, selectMentor } from 'src/redux/actions'

import Header from 'src/components/header'
import Input from 'src/components/input'
import Video from 'src/components/video'
import VideoPanel from 'src/components/video-panel'
import withLocation from 'src/wrap-with-location'

import 'src/styles/layout.css'

const IndexPage = ({ search, ...props }) => {
  const dispatch = useDispatch()
  const mentors = useSelector(state => state.mentors_by_id)
  const [height, setHeight] = useState(0)
  const [width, setWidth] = useState(0)
  const { recommended } = search

  useEffect(() => {
    const data = props.data.allMentorsCsv.edges
    data.forEach(item => {
      dispatch(loadMentor(item.node))
      dispatch(loadQuestions(item.node.id, recommended))
    });
    dispatch(selectMentor(data[0].node.id))

    setHeight(window.innerHeight * 0.5)
    setWidth(window.innerWidth)
    window.addEventListener('resize', handleWindowResize)
    return () => {
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [])

  const handleWindowResize = () => {
    if (typeof window === `undefined`) {
      return
    }
    setHeight(window.innerHeight * 0.5)
    setWidth(window.innerWidth)
  }

  if (mentors === {} || height === 0 || width === 0) {
    return <CircularProgress />
  }

  return (
    <div>
      <div className='flex' style={{ height: height }}>
        <div className='content' style={{ height: '60px' }}>
          <VideoPanel />
        </div>
        <div className='content' style={{ height: '30px' }}>
          <Header />
        </div>
        <div className='expand'>
          <Video height={height - 90} width={width} />
        </div>
      </div>
      <Input height={height} />
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