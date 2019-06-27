import React, { useEffect } from "react"
import { ListItem, ListItemText } from '@material-ui/core'

import { normalizeString } from 'src/funcs/funcs'

const ScrollingQuestions = ({ questions, questions_asked, recommended, onQuestionSelected }) => {
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
      <ListItem
        key={i}
        id={question}
        divider={true}
        onClick={() => onQuestionSelected(question)}
        style={{ backgroundColor: recommended.includes(question) ? '#f1f9fd' : 'inherit' }}
      >
        <ListItemText style={{ paddingLeft: 0, color: questions_asked.includes(normalizeString(question)) ? 'gray' : 'black' }}>
          {question}
        </ListItemText>
      </ListItem>
    )
  )
}

export default ScrollingQuestions