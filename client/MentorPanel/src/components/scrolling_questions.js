import React, { useEffect } from "react"
import PropTypes from 'prop-types'
import classNames from 'classnames'
import { Button, ListItem } from '@material-ui/core'
import { NewReleases } from '@material-ui/icons'
import { withStyles } from '@material-ui/core/styles'

import { normalizeString } from 'src/funcs/funcs'

const ScrollingQuestions = ({ questions, questions_asked, recommended, onQuestionSelected, ...props }) => {
  const { classes } = props;

  useEffect(() => {
    const top_question = questions.find(q => {
      return !questions_asked.includes(normalizeString(q))
    })

    const node = document.getElementById(top_question)
    if (!(top_question && node)) {
      return
    }

    node.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  })

  questions.sort((a, b) => {
    if (recommended.includes(a) && recommended.includes(b)) {
      return questions.indexOf(a) - questions.indexOf(b)
    }
    if (recommended.includes(a)) {
      return -1
    }
    if (recommended.includes(b)) {
      return 1
    }
    return 0
  })

  return (
    questions.map((question, i) =>
      <ListItem key={i} id={question}>
        <Button
          className={classNames(classes.button)}
          fullWidth={true}
          style={{ color: questions_asked.includes(normalizeString(question)) ? 'gray' : 'black' }}
          onClick={() => onQuestionSelected(question)}
        >
          <div className={classNames(classes.text)}>
            {recommended.includes(question) ? <NewReleases className={classNames(classes.icon)}/> : undefined}
            {question}
          </div>
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
  text: {
    width: '100%',
  },
  icon: {
    fontSize: '10px',
    marginRight: '5px',
  },
});

ScrollingQuestions.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(ScrollingQuestions)