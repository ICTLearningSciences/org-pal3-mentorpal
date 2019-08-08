import React, { useEffect } from "react";
import { ListItem, ListItemText } from "@material-ui/core";
import { Whatshot } from "@material-ui/icons";

import { normalizeString } from "funcs/funcs";

const ScrollingQuestions = ({
  questions,
  questions_asked,
  recommended,
  onQuestionSelected,
}) => {
  useEffect(() => {
    const top_question = questions.find(q => {
      return !questions_asked.includes(normalizeString(q));
    });

    const node = document.getElementById(top_question);
    if (!(top_question && node)) {
      return;
    }

    node.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });

  return questions.map((question, i) => (
    <ListItem
      key={i}
      id={question}
      onClick={() => onQuestionSelected(question)}
    >
      <ListItemText
        style={{
          paddingLeft: 0,
          color: questions_asked.includes(normalizeString(question))
            ? "gray"
            : "black",
        }}
      >
        {recommended.includes(question) ? (
          <Whatshot style={{ marginRight: "5px" }} fontSize="small" />
        ) : (
          undefined
        )}
        {question}
      </ListItemText>
    </ListItem>
  ));
};

export default ScrollingQuestions;
