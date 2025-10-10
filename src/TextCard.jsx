import { useState } from "react";
import Text from "./Text.jsx";
import Input from "./Input.jsx";
import DownArrow from "/down-arrow.png";

const TextCard = (props) => {
  const { card, onButtonClicked, id, index, userParams, setUserParams } = props;

  const [showDisclaimer, setShowDisclaimer] = useState(false);

  var cn = "card";
  if (card.hidden) {
    cn += " hidden";
  }
  if (card.top) {
    cn += " top";
  }

  const onDisclaimerClicked = () => {
    setShowDisclaimer(true);
  };

  return (
    <div className="card-container" style={{ top: index * 100 + "vh" }}>
      <div className={cn} id={id}>
        {card.title && <Text text={card.title} title={true} />}
        {card.subtitle && <Text text={card.subtitle} subtitle={true} />}
        {card.texts &&
          card.texts.map((text, i) => {
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
          />
        )}

        {card.button && !card.input && (
          <div id="button-container">
            <button
              className="button"
              id="next-button"
              onClick={onButtonClicked}
            >
              {card.button}
            </button>
          </div>
        )}
        {card.disclaimer && (
          <div
            className={"disclaimer " + (showDisclaimer ? "shown" : "")}
            onClick={onDisclaimerClicked}
          >
            {showDisclaimer ? card.disclaimer : "Why do you need this?"}
          </div>
        )}
        {!card.button && <img className="down-arrow" src={DownArrow} />}
      </div>
    </div>
  );
};

export default TextCard;
