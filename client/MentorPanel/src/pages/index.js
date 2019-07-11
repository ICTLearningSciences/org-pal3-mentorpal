import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { graphql } from 'gatsby'
import { CircularProgress } from '@material-ui/core'
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles'

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
  const { recommended, mentor } = search

  const isMobile = width < 768
  const videoHeight = isMobile ? height * 0.5 : Math.min(width * 0.5625, 700)
  const inputHeight = isMobile ? height * 0.5 : Math.max(height - videoHeight, 250)

  useEffect(() => {
    const data = props.data.allMentorsCsv.edges
    const mentorData = data.find((item) => {
      return item.node.id === mentor
    })

    // Load the data for a single mentor
    if (mentorData) {
      dispatch(loadMentor(mentorData.node))
      dispatch(loadQuestions(mentor, recommended))
      dispatch(selectMentor(mentor))
    }
    // Load the list of mentors and questions
    else {
      data.forEach(item => {
        dispatch(loadMentor(item.node))
        dispatch(loadQuestions(item.node.id, recommended))
      });
      dispatch(selectMentor(data[0].node.id))  
    }

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
        { mentor ? undefined :
            <div className='content' style={{ height: '100px' }}>
              <VideoPanel isMobile={isMobile} />
              <Header />
            </div>
        }
        <div className='expand'>
          <Video height={videoHeight - (mentor ? 0 : 100)} width={width} />
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