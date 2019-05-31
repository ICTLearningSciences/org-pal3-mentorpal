import React from 'react'
import { connect } from 'react-redux';

const Header = ({ ...props }) => {
  if (!props.mentor) {
    return <div></div>
  }

  return (
    <h4>{`${props.mentor.name}: ${props.mentor.title}`}</h4>
  )
}

const mapStateToProps = state => {
  return {
    mentor: state.mentors[state.cur_mentor]
  }
}

export default connect(mapStateToProps)(Header);
