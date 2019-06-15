import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import FlipMove from 'react-flip-move';
import { useSelector } from 'react-redux';

import { Button, List, ListItem } from '@material-ui/core'
import { withStyles, MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles'

const Questions = ({ onQuestionSelected, ...props }) => {
  const { classes } = props;
  const current_topic = useSelector(state => state.current_topic)
  const mentor = useSelector(state => state.mentors_by_id[state.current_mentor])

  try {
    const questions = mentor.topic_questions[current_topic]
    return (
      <MuiThemeProvider theme={theme}>
        <List style={{ maxHeight: '100px', overflow: 'auto' }}>
          <FlipMove>
            {questions.map((question, i) =>
              <ListItem key={i}>
                <Button
                  className={classNames(classes.button)}
                  onClick={() => onQuestionSelected(question)}>
                  {question}
                </Button>
              </ListItem>
            )}
          </FlipMove>
        </List>
      </MuiThemeProvider>
    )
  } catch {
    return <div></div>
  }
}

const styles = ({
  button: {
    textTransform: 'none',
    textAlign: 'left',
  },
});

const theme = createMuiTheme({
  palette: {
    primary: { main: '#1B6A9C' },
  },
  typography: { useNextVariants: true },
});

Questions.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Questions);