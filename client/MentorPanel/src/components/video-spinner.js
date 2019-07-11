import React from 'react'
import { useSelector } from 'react-redux'
import { CircularProgress } from '@material-ui/core'

const LoadingSpinner = ({ mentor, width, height }) => {
  const question = useSelector(state => state.current_question)
  const offset_width = (0.5 * width) - 15
  const offset_height = (0.5 * height) - 15

  if (question && question !== mentor.question) {
    return <CircularProgress className='spinner' style={{top: `${offset_height}px`, left: `${offset_width}px`}}/>
  }

  return <div></div>
}

export default LoadingSpinner