import React from 'react'
import { useSelector } from 'react-redux'

const Header = () => {
  const mentor = useSelector(state => state.mentors[state.cur_mentor])

  if (!mentor) {
    return <div></div>
  }

  return (
    <h4>{`${mentor.name}: ${mentor.title}`}</h4>
  )
}

export default Header
