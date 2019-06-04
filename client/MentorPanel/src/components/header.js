import React from 'react'
import { useSelector } from 'react-redux'

const Header = () => {
  const mentor = useSelector(state => state.mentors_by_id[state.current_mentor])

  try {
    return <h4>{`${mentor.name}: ${mentor.title}`}</h4>
  }
  catch (err) {
    return <div></div>
  }
}

export default Header