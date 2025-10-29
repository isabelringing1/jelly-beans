import { useState, useEffect } from "react";

import TextCard from "./TextCard.jsx";
import instructions from "./json/instructions.json";
import { getDaysLeft } from "./util/TimeCalculator.js";

const TextContainer = (props) => {
  const { userParams, setUserParams, setShowCategories } = props;
  const [currentSequence, setCurrentSequence] = useState(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [days, setDays] = useState(0);

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
      nextCard(); // will be empty
      setTimeout(() => {
        setCurrentCardIndex(currentCardIndex + 2); //so hacky
      }, 2500);
      return;
    }
    if (card.id == "pre-reveal") {
      document.dispatchEvent(
        new CustomEvent("show-jelly-beans", { detail: { days: days } })
      );
      nextCard(); // will be empty
      setTimeout(() => {
        setCurrentCardIndex(currentCardIndex + 2); //so hacky
      }, 6000);
      return;
    }
    if (card.id == "show-categories") {
      setShowCategories(true);
    }
    if (card.id == "guess") {
      setTimeout(() => {
        document.getElementById("container-label-0").style.opacity = 1;
      }, 1500);
    }

    nextCard();
  };

  const nextCard = () => {
    setCurrentCardIndex(currentCardIndex + 1);
  };

  return (
    <div
      id="text-container"
      onClick={onTextContainerClicked}
      style={{ top: -100 * currentCardIndex + "vh" }}
    >
      {currentSequence &&
        currentSequence.cards.map((card, i) => {
          return (
            <TextCard
              card={card}
              onButtonClicked={onButtonClicked}
              index={i}
              key={"card-" + i}
              id={"card-" + i}
              userParams={userParams}
              setUserParams={setUserParams}
              days={days}
            />
          );
        })}
    </div>
  );
};

export default TextContainer;
