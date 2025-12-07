import { useState } from "react";
import Text from "./Text.jsx";
import Input from "./Input.jsx";
import DownArrow from "/down-arrow.png";

const TextCard = (props) => {
  const {
    card,
    onButtonClicked,
    id,
    index,
    userParams,
    setUserParams,
    days,
    loaded,
  } = props;

  const [showDisclaimer, setShowDisclaimer] = useState(false);

  var cn = "card";
  if (card.hidden) {
    cn += " hidden";
  }
  if (card.bottom) {
    cn += " bottom";
  }

  const onDisclaimerClicked = () => {
    setShowDisclaimer(true);
  };

  const processText = (text) => {
    if (text.includes("[DAYS]")) {
      text = text.replace("[DAYS]", days.toLocaleString());
    }
    if (text.includes("[OFF]")) {
      var guess = userParams.guess ?? 0;
      var daysOff = Math.abs(days - parseInt(guess));
      text = text.replace("[OFF]", daysOff.toLocaleString());
    }
    return text;
  };

  return (
    <div className="card-container" style={{ top: index * 100 + "vh" }}>
      <div className={cn} id={id}>
        {card.title && <Text text={card.title} title={true} />}
        {card.subtitle && <Text text={card.subtitle} subtitle={true} />}
        {card.texts &&
          card.texts.map((text, i) => {
            text = processText(text);
            return <Text text={text} key={"text-" + i} />;
          })}

        {card.input && (
          <Input
            id={card.id}
            type={card.input}
            options={card.options}
            userParams={userParams}
            setUserParams={setUserParams}
            onButtonClicked={onButtonClicked}
            button={card.button}
            long={card.long}
          />
        )}

        {card.button && !card.input && (
          <div id="button-container">
            <button
              className={"button " + (loaded ? "" : " disabled")}
              disabled={!loaded}
              id="next-button"
              onClick={onButtonClicked}
              tabIndex="-1"
            >
              {loaded ? card.button : "LOADING..."}
            </button>
          </div>
        )}
        {card.disclaimer && (
          <div
            className={"disclaimer " + (showDisclaimer ? "shown" : "")}
            onClick={onDisclaimerClicked}
          >
            {showDisclaimer ? card.disclaimer : "Why is this needed?"}
          </div>
        )}
        {!card.button && <img className="down-arrow" src={DownArrow} />}
      </div>
    </div>
  );
};

export default TextCard;
