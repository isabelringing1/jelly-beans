import { useState, useRef, useEffect } from "react";

const CategoryCard = (props) => {
  const { card, index, categoryCardClicked } = props;
  const [opened, setOpened] = useState(false);
  const [started, setStarted] = useState(false);
  const [validInput, setValidInput] = useState(false);

  const [input, setInput] = useState("");
  const [showError, setShowError] = useState(false);
  const [lastLockedInInput, setLastLockedInInput] = useState(null);

  var cn = "card category-card";
  cn += opened ? " opened" : " closed";

  var arrowCn = "prompt-arrow";
  arrowCn += opened ? " arrow-opened" : "";
  arrowCn += started ? " edit-arrow" : " start-arrow";

  useEffect(() => {
    if (!opened && lastLockedInInput) {
      setInput(lastLockedInInput);
    }
  }, [opened]);

  const isInputValid = (value) => {
    setShowError(false);
    if (!/[0-9]/.test(value)) {
      return false;
    }
    if (value < 0) {
      return false;
    }
    if (card.daily && value > 24) {
      setShowError(true);
      return false;
    }
    if (card.weekly && value > 24 * 7) {
      setShowError(true);
      return false;
    }
    return true;
  };

  const onInputChange = (e) => {
    console.log(e);
    var isValid = isInputValid(e.target.value);
    setValidInput(isValid);
    setInput(e.target.value);
  };

  const onButtonPressed = () => {
    if (!validInput) {
      return;
    }
    setStarted(true);
    setLastLockedInInput(input);
    document.dispatchEvent(
      new CustomEvent("category-set", {
        detail: { index: index, percent: calculatePercent() },
      })
    );
  };

  const calculatePercent = () => {
    if (!validInput) {
      console.log("Error calculating percent, returning 0");
      return 0;
    }
    var percent = 0;
    if (card.weekly) {
      percent = input / (24 * 7);
    } else if (card.daily) {
      percent = input / 24;
    }
    return percent;
  };
  return (
    <div
      className={cn}
      onClick={(e) => {
        var cn = e.target.className;
        if (
          !cn.includes("prompt-text") &&
          !e.target.closest(".prompt-input-div")
        ) {
          categoryCardClicked();
          setOpened(!opened);
        }
      }}
    >
      <div className="card-title-div">
        <div className="card-title">{card.title}</div>
        {!opened && started && <div className="card-prompt edit">EDIT </div>}
        {!opened && !started && <div className="card-prompt start">START </div>}
      </div>
      <div className={arrowCn}></div>

      {opened && <div className="text-div prompt-text">{card.text}</div>}
      {opened && card.hint && (
        <div className="text-div prompt-hint">{card.hint}</div>
      )}
      {opened && (
        <div className="prompt-input-div">
          <input
            id={"prompt-input-" + card.id}
            className="input prompt-input"
            type="number"
            onChange={onInputChange}
            value={input}
          />
          <span className="prompt-hours"> hours</span>

          <button
            className={"button prompt-button " + (validInput ? "" : "disabled")}
            onClick={onButtonPressed}
          >
            DONE
          </button>
          {showError && (
            <div className="prompt-error">
              That's too many hours for a {card.daily ? "day" : "week"}.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CategoryCard;
