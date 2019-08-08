import React from "react";
import { useSelector } from "react-redux";

const Header = () => {
  const mentor = useSelector(
    state => state.mentors_by_id[state.current_mentor]
  );

  return (
    <div id="header">
      {mentor ? `${mentor.name}: ${mentor.title}` : undefined}
    </div>
  );
};

export default Header;
