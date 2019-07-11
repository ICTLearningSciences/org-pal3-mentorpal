import React from 'react'
import { useSelector } from 'react-redux'
import { CircularProgress } from '@material-ui/core'

const LoadingSpinner = ({ mentor }) => {
  const question = useSelector(state => state.current_question)

  if (question && question !== mentor.question) {
    return <CircularProgress className='spinner' />
  }
  return <div></div>
}

export default LoadingSpinner