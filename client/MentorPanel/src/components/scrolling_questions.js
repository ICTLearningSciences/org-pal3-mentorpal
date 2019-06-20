import React from 'react';
import PropTypes from 'prop-types'
import classNames from 'classnames'
import { Button, ListItem } from '@material-ui/core'
import { withStyles } from '@material-ui/core/styles'

import { normalizeString } from 'src/funcs/funcs'

class ScrollingQuestions extends React.Component {

  componentDidUpdate() {
    const top_question = this.props.questions.find(q => {
      return !this.props.questions_asked.includes(normalizeString(q))
    })
    
    const node = document.getElementById(top_question);
    node.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  render() {
    const { classes } = this.props;

    return (
      this.props.questions.map((question, i) =>
        <ListItem key={i} id={question}>
          <Button
            className={classNames(classes.button)}
            style={{ color: this.props.questions_asked.includes(normalizeString(question)) ? 'gray' : 'black' }}
            onClick={() => this.props.onQuestionSelected(question)}>
            {question}
          </Button>
        </ListItem>
      )
    )
  }
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