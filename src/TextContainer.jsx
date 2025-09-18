import { useState, useEffect } from "react";

import TextCard from "./TextCard.jsx";
import instructions from "./instructions.json";
import { getDaysLeft } from "./util/TimeCalculator.js";

const TextContainer = (props) => {
  const { userParams, setUserParams } = props;
  const [currentSequence, setCurrentSequence] = useState(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [days, setDays] = useState(0);
  const [hide, setHide] = useState(false);

  useEffect(() => {
    var sequence = instructions["start"];
    setCurrentSequence(sequence);
  }, []);

  const onTextContainerClicked = () => {
    if (currentSequence.cards[currentCardIndex].button) {
      return;
    }
    processCard();
  };

  const onButtonClicked = () => {
    processCard();
  };

  const processCard = () => {
    var card = currentSequence.cards[currentCardIndex];
    if (card.id == "race") {
      document.dispatchEvent(
        new Event("answered-questions", { bubbles: true })
      );
      var d = getDaysLeft(userParams);
      console.log("calculated days: " + d);
      setDays(d);
      hideCards();
      setTimeout(() => {
        showCards();
        nextCard();
      }, 1000);
      return;
    }
    if (card.id == "pre-reveal") {
      document.dispatchEvent(
        new CustomEvent("show-jelly-beans", { detail: { days: days } })
      );
      hideCards();
      setTimeout(() => {
        showCards();
        nextCard();
      }, 2800);
      return;
    }
    nextCard();
  };

  const nextCard = () => {
    setCurrentCardIndex(currentCardIndex + 1);
  };

  const hideCards = () => {
    setHide(true);
  };

  const showCards = () => {
    setHide(false);
  };

  return (
    <div id="text-container" onClick={onTextContainerClicked}>
      {currentSequence &&
        currentSequence.cards.map((card, i) => {
          return (
            <TextCard
              card={card}
              onButtonClicked={onButtonClicked}
              isCurrent={i == currentCardIndex && !hide}
              key={"card-" + i}
              id={"card-" + i}
              userParams={userParams}
              setUserParams={setUserParams}
            />
          );
        })}
    </div>
  );
};

export default TextContainer;
