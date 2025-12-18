import { useState, useEffect, useRef } from "react";

import TextCard from "./TextCard.jsx";
import instructions from "./json/instructions.json";
import { getDaysLeft } from "./util/TimeCalculator.js";

const TextContainer = (props) => {
  const {
    userParams,
    setUserParams,
    setShowCategories,
    days,
    setDays,
    loaded,
    isMobile,
  } = props;
  const [currentSequence, setCurrentSequence] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  var isAnimating = useRef(false);

  useEffect(() => {
    var sequence = instructions["start"];
    setCurrentSequence(sequence);
  }, []);

  const onScroll = (e) => {
    if (
      isAnimating.current ||
      !currentSequence ||
      currentSequence.cards[currentCardIndex].button
    ) {
      return;
    }

    if (e.deltaY > 20) {
      processCard();
    }
  };

  const onTextContainerClicked = () => {
    if (currentSequence.cards[currentCardIndex].button || isAnimating.current) {
      return;
    }
    processCard();
  };

  const onButtonClicked = () => {
    if (isAnimating.current) {
      return;
    }
    console.log("processing");
    processCard();
  };

  const processCard = () => {
    var card = currentSequence.cards[currentCardIndex];
    if (card.id == "race") {
      document.dispatchEvent(
        new Event("answered-questions", { bubbles: true })
      );
      var d = getDaysLeft(userParams);
      setDays(d);
      nextCard(false); // will be empty
      setTimeout(() => {
        setCurrentCardIndex(currentCardIndex + 2); //so hacky
        isAnimating.current = false;
      }, 2500);
      return;
    }
    if (card.id == "pre-reveal") {
      document.dispatchEvent(
        new CustomEvent("show-jelly-beans", { detail: { days: days } })
      );
      nextCard(false); // will be empty
      setTimeout(() => {
        setCurrentCardIndex(currentCardIndex + 2); //so hacky
        isAnimating.current = false;
      }, 6000);
      return;
    }
    if (card.id == "show-categories") {
      setShowCategories(true);
    }
    if (card.id == "guess") {
      setTimeout(() => {
        document.getElementById("container-label-0").style.opacity = 1;
      }, 1000);
    }

    nextCard();
  };

  const nextCard = (shouldSetTimeout = true) => {
    setCurrentCardIndex(currentCardIndex + 1);
    isAnimating.current = true;
    if (shouldSetTimeout) {
      setTimeout(() => {
        isAnimating.current = false;
      }, 600);
    }
  };

  return (
    <div
      id="text-container"
      onClick={onTextContainerClicked}
      onWheel={onScroll}
      style={{
        top: -100 * currentCardIndex + "vh",
        pointerEvents: loaded ? "auto" : "none",
      }}
    >
      {currentSequence.cards &&
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
              loaded={loaded}
              isMobile={isMobile}
            />
          );
        })}
    </div>
  );
};

export default TextContainer;
