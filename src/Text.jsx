import Markdown from "react-markdown";

const Text = (props) => {
  const { text, title, subtitle } = props;
  var cn = "text-div";
  if (title) {
    cn += " title";
  }
  if (subtitle) {
    cn += " subtitle";
  }
  return (
    <div className={cn}>
      <Markdown>{text}</Markdown>
    </div>
  );
};

export default Text;
