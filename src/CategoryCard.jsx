import { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";

const CategoryCard = (props) => {
  const {
    card,
    index,
    categoryCardClicked,
    selected,
    setSelectedCardIndex,
    setWildcardCategory,
  } = props;
  const [opened, setOpened] = useState(false);
  const [started, setStarted] = useState(false);
  const [validInput, setValidInput] = useState(false);

  const [input, setInput] = useState("");
  const [showError, setShowError] = useState(false);
  const [lastLockedInInput, setLastLockedInInput] = useState(null);

  const diyRef = useRef("week");

  var cn = "card category-card";
  cn += opened ? " opened" : " closed";
  cn += selected ? " selected" : "";

  var arrowCn = "prompt-arrow";
  arrowCn += opened ? " arrow-opened" : "";
  arrowCn += started ? " edit-arrow" : " start-arrow";

  const resetCard = () => {
    document.dispatchEvent(
      new CustomEvent("reset-category", {
        detail: { index: index },
      })
    );
    setStarted(false);
    setInput("");
    setValidInput(false);
    setShowError(false);
    setLastLockedInInput(null);
  };

  useState(() => {
    document.addEventListener("reset-categories", resetCard);
  }, []);

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
        detail: {
          index: index,
          percent: card.diy ? calculatePercentDiy() : calculatePercent(),
        },
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

  const calculatePercentDiy = () => {
    if (!validInput) {
      console.log("Error calculating percent, returning 0");
      return 0;
    }
    console.log(diyRef.current);
    if (diyRef.current == "week") {
      return input / (24 * 7);
    } else if (diyRef.current == "day") {
      return input / 24;
    }
    if (diyRef.current == "year") {
      return input / (24 * 365.25);
    }
    return 0;
  };

  return (
    <div
      id={"category-" + index}
      className={cn}
      onClick={(e) => {
        var cn = e.target.className;
        if (
          !cn.includes("prompt-text") &&
          !e.target.closest(".prompt-input-div")
        ) {
          categoryCardClicked();

          if (opened && selected) {
            setSelectedCardIndex(-1);
            setOpened(false);
          } else {
            setSelectedCardIndex(index);
            setOpened(true);
            document.dispatchEvent(
              new CustomEvent("category-selected", {
                detail: { index: index },
              })
            );
          }
        }
      }}
      onMouseEnter={() => {
        document.dispatchEvent(
          new CustomEvent("highlight-category", {
            detail: { index: index },
          })
        );
      }}
      onMouseLeave={() => {
        document.dispatchEvent(
          new CustomEvent("unhighlight-category", {
            detail: { index: index },
          })
        );
      }}
    >
      <div className="card-title-div">
        <div className="card-title">{card.title}</div>
        {!opened && started && <div className="card-prompt edit">EDIT </div>}
        {!opened && !started && <div className="card-prompt start">START </div>}
      </div>
      <div className={arrowCn}></div>

      {opened && !card.diy && (
        <div className="text-div prompt-text">
          <Markdown>{card.text}</Markdown>
        </div>
      )}

      {opened && card.diy && (
        <div className="text-div prompt-text">
          How many hours a{"  "}
          <select
            name="selectedOption"
            className="select-input prompt-select-input prompt-text"
            onChange={(e) => {
              console.log(e.target.value);
            }}
          >
            <option className="prompt-option" value="week">
              week
            </option>
            <option className="prompt-option" value="day">
              day
            </option>
            <option className="prompt-option" value="year">
              year
            </option>
          </select>
          {"  "}do you spend{" "}
          <input
            className="input prompt-input prompt-text prompt-inline-input"
            placeholder="gaming"
            onChange={(e) => {
              setWildcardCategory(e.target.value != "" ? e.target.value : "");
            }}
          />
          ?
        </div>
      )}
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

          {started && (
            <span className="reset-button" onClick={resetCard}>
              RESET
            </span>
          )}

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
