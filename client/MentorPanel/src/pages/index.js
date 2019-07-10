import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { graphql } from 'gatsby'
import { CircularProgress } from '@material-ui/core'
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';

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

  const isMobile = width < 768
  const videoHeight = isMobile ? height * 0.5 : Math.min(width * 0.5625, 700)
  const inputHeight = isMobile ? height * 0.5 : Math.max(height - videoHeight, 250)

  useEffect(() => {
    // Load the list of mentors and questions
    const data = props.data.allMentorsCsv.edges
    data.forEach(item => {
      dispatch(loadMentor(item.node))
      dispatch(loadQuestions(item.node.id, recommended))
    });
    dispatch(selectMentor(data[0].node.id))

    // Media queries for layout
    setHeight(window.innerHeight)
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
    setHeight(window.innerHeight)
    setWidth(window.innerWidth)
  }

  if (mentors === {} || height === 0 || width === 0) {
    return <CircularProgress />
  }

  return (
    <MuiThemeProvider theme={theme}>
      <div className='flex' style={{ height: videoHeight }}>
        <div className='content' style={{ height: '60px' }}>
          <VideoPanel />
        </div>
        <div className='content' style={{ height: '30px' }}>
          <Header />
        </div>
        <div className='expand'>
          <Video height={videoHeight - 90} width={width} />
        </div>
      </div>
      <Input height={inputHeight} />
    </MuiThemeProvider>
  )
}

const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#1b6a9c'
    }
  }
})

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