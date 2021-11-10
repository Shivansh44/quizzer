const heading = document.querySelector(".heading");
const question = document.querySelector(".question");
const prev = document.querySelector(".prev");
const next = document.querySelector(".next");
const clock = document.querySelector(".clock");
const labels = document.querySelectorAll("label");
const inputs = document.querySelectorAll("input");

const answers = [];
const options = [];
for (let i = 0 ; i < qnNum ; i++) {answers.push(false); options.push(-1);}

corOpt = ["A", "B", "C", "D"];

function sleep() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, 1000);
  });
}

let data,
  counter = 0;

async function getData() {
  const resp = await fetch(url);
  data = await resp.json();
}

getData();

function update(counter) {
  let obj = data[counter];
  heading.innerHTML = heading.innerHTML = `Question ${obj.questionId}`;
  question.innerHTML = `${obj.question}`;
  labels[0].innerHTML = `${obj.optionA}`;
  labels[1].innerHTML = `${obj.optionB}`;
  labels[2].innerHTML = `${obj.optionC}`;
  labels[3].innerHTML = `${obj.optionD}`;
  if (options[counter] != -1) {
    inputs[options[counter]].checked = true;
  }
}

async function loadData() {
  while (true) {
    if (data) {
      console.log(data);
      break;
    }
    await sleep();
  }
  update(counter);
}

loadData();

prev.addEventListener("click", () => {
  if (counter == 0) return;
  for (let i = 0; i < 4; i++) {
    if (inputs[i].checked) {
      options[counter] = i;
      if (data[counter].correctOption == corOpt[i]) answers[counter] = true;
      else answers[counter] = false;
      inputs[i].checked = false;
      break;
    }
  }
  if (counter != 0) {
    counter -= 1;
    update(counter);
  }
});

next.addEventListener("click", () => {
  if (counter == qnNum-1) return;

  for (let i = 0; i < 4; i++) {
    if (inputs[i].checked) {
      options[counter] = i;
      if (data[counter].correctOption == corOpt[i]) answers[counter] = true;
      else answers[counter] = false;
      inputs[i].checked = false;
      break;
    }
  }
  if (counter != qnNum-1) {
    counter += 1;
    update(counter);
  }
});

function thanksPage() {
  const container = document.querySelector(".container");
  container.innerHTML = "";
  container.style.alignItems = "center";
  let score = 0;
  for (let i = 0; i < qnNum; i++) {
    if (answers[i]) score += 10;
  }
  container.innerHTML = `<div class="heading final">You Scored <span class="score">${score}</span> out of ${qnNum * 10}</div>`;
  const button = document.createElement("a");
  const form = document.createElement("form");
  form.method = "POST";
  form.action = formActionUrl;
  const input = document.createElement("input");
  input.setAttribute("type" , "number");
  input.setAttribute("name" , "score");
  input.setAttribute("value" , score);
  form.append(input);
  form.style.display = "none";
  container.append(form);
  button.className += "btn";
  button.innerText = "Save Scores";
  container.append(button);
  button.addEventListener("click" , (evt) => {
    form.submit();
  })
}


let currentTime = Date.parse(new Date());
let deadline = new Date(currentTime + timeInMinutes * 60 * 1000);

async function change() {
  while (true) {
    if (currentTime >= deadline) {
      document.querySelector(".container").innerHTML = `HELLO WORLD`;
      thanksPage();
      break;
    }
    currentTime += 1000;
    await sleep();
    let secs = Math.trunc((deadline - currentTime) / 1000);
    let mins = Math.trunc(secs / 60);
    secs = secs % 60;
    clock.innerHTML = `${mins} : ${secs}`;
  }
}

change();
