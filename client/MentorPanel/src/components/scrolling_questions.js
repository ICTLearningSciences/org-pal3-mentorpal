import React, { useEffect } from "react"
import PropTypes from 'prop-types'
import classNames from 'classnames'
import { Button, ListItem } from '@material-ui/core'
import { withStyles } from '@material-ui/core/styles'

import { normalizeString } from 'src/funcs/funcs'

const ScrollingQuestions = ({ questions, questions_asked, onQuestionSelected, ...props }) => {
  const { classes } = props;

  useEffect(() => {
    const top_question = questions.find(q => {
      return !questions_asked.includes(normalizeString(q))
    })

    const node = document.getElementById(top_question);
    node.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  })

  return (
    questions.map((question, i) =>
      <ListItem key={i} id={question}>
        <Button
          className={classNames(classes.button)}
          style={{ color: questions_asked.includes(normalizeString(question)) ? 'gray' : 'black' }}
          onClick={() => onQuestionSelected(question)}>
          {question}
        </Button>
      </ListItem>
    )
  )
}

const styles = ({
  button: {
    textTransform: 'none',
    textAlign: 'left',
  },
});

ScrollingQuestions.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(ScrollingQuestions)