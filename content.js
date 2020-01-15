const SANITA_ID = "30f961e345f4894df1bd0e961a";
const SANITA_AVATAR = "https://tc.tradersclub.com.br/api/v4/users/30f961e345f4894df1bd0e961a/image?_=1561491021660";

let postsBySanita;
let tickerKey = "";

const fetchResource = (input, init) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({input, init}, messageResponse => {
      const [response, error] = messageResponse;
      if (response === null) {
        reject(error);
      } else {
        resolve(new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
        }));
      }
    });
  });
}

const createPermalink = postId => `https://tc.tradersclub.com.br/tradersclub/pl/${postId}`;

const closeSidebar = () => {
  document.querySelector(".sanita-sidebar").remove();
  document.querySelector(".sanita-overlay").remove();
  tickerKey = "";
}

const onFilterChange = e => {
  tickerKey = e.target.value;
  renderList();
};

const fetchPosts = async () => {
  const response = await fetchResource(`https://tc.tradersclub.com.br/api/v4/channels/ggn6rok18igcpm67n8iomdkb8h/posts?page=0&per_page=150`, {
      method: "GET",
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin':'*',
        'Authorization': `Bearer ${localStorage.getItem("token")}`
      },
    });

  const { order, posts } = await response.json();
  postsBySanita = []
  const tickers = [];
  order.forEach(postId => {
    const post = posts[postId];

    // Only add posts from Sanita, that are of type "ticker" and that hadn't been added yet
    if ( 
      post.user_id === SANITA_ID && 
      post.type === "ticker" && 
      !tickers.includes(post.ticker) 
    ) {
      postsBySanita.push(post);
      tickers.push(post.ticker);
    }
  });
  
  // Create and add container and sidebar
  const container = document.querySelector('#channel-main');
  const overlay = document.createElement('div');
  overlay.classList.add('sanita-overlay');
  container.insertAdjacentElement("beforeend", overlay);
  const sidebar = document.createElement('div');
  sidebar.classList.add('sanita-sidebar');

  // Add close button
  const close = document.createElement('button');
  close.classList = "sanita-close"
  const icon = document.createElement('i');
  icon.classList = "tcnews icon-close";
  close.appendChild(icon)
  close.onclick = closeSidebar;
  sidebar.appendChild(close);

  // Add header elements
  const header = document.createElement('h1');
  header.textContent = "Últimas Análises";
  sidebar.appendChild(header)
  const paragraph = document.createElement('p');
  paragraph.classList = "sanita-info";
  const strong = document.createElement("strong");
  strong.textContent = "Pesquise antes de solicitar uma nova análise.";
  paragraph.textContent = "Clique no ticker para ver a análise mais recente sobre o ativo ou passe o mouse sobre a linha para ler o comentário. ";
  paragraph.appendChild(strong);
  sidebar.appendChild(paragraph);
  const rule = document.createElement('hr');
  sidebar.appendChild(rule);

  // Add input
  const input = document.createElement('input');
  input.placeholder = "Filtre pelo ticker. Ex: PETR"
  input.oninput = onFilterChange;
  sidebar.appendChild(input);

  // Add elements to the DOM
  container.appendChild(sidebar)
  container.insertAdjacentElement("beforeend", sidebar);
  input.focus();

  // Render list of tickers
  renderList();
}

const renderList = () => {
  // Filter posts based on the key
  const posts = tickerKey === "" 
    ? postsBySanita 
    : postsBySanita.filter(({ticker}) => ticker.toLowerCase().includes(tickerKey.toLowerCase()));

  // If no post match the key, display no results message
  if ( posts.length === 0 ) {
    const noResults = document.createElement('p');
    noResults.classList = "sanita-no-results";
    noResults.textContent = "Sem resultados.";
    updateSidebar(noResults);
    return;
  }

  // Create list of tickers
  const list = document.createElement('ul');
  posts.forEach((post) => {
    const item = document.createElement('li');
    const div = document.createElement('div');
    div.title = post.message;
    const link = document.createElement('a');
    link.href = createPermalink(post.id);
    link.textContent = post.ticker;
    link.target = "_blank";
    div.appendChild(link)

    // Evaluate how old is the post
    const span = document.createElement('span');
    const totalMinutes = Math.floor(moment.duration(moment().diff(moment(post.create_at))).asMinutes());
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);
    const days = Math.floor(hours / 24);

    // Add proper text
    let text;
    if ( days > 0 ) text = `${days}d atrás`;
    else if ( hours > 0 && minutes === 0 ) text = `${hours}h atrás`;
    else if ( hours > 0 && minutes > 0 ) text = `${hours}h ${minutes}m atrás`;
    else if ( hours === 0 && minutes > 0 ) text = `${minutes}m atrás`;
    else text = "agora";

    span.textContent = text;
    div.appendChild(span);
    item.appendChild(div);
    list.appendChild(item);
  })
  
  // Add list to sidebar
  updateSidebar(list);
}

const updateSidebar = node => {
  document.querySelector('.sanita-sidebar ul') && document.querySelector('.sanita-sidebar ul').remove();
  document.querySelector('.sanita-no-results') && document.querySelector('.sanita-no-results').remove();
  document.querySelector('.sanita-sidebar').appendChild(node);
};

// Create launch button only after the header is rendered
document.arrive('.render-search-box', {}, function() {
  const searchBoxContainer = document.querySelector('.render-search-box');
  const button = document.createElement('button');
  button.classList = "sanita-button";
  const image = document.createElement("img");
  image.src = SANITA_AVATAR;
  button.appendChild(image);
  button.onclick = fetchPosts;
  searchBoxContainer.appendChild(button);
});

// Add a listener to close the sidebar if user presses ESC whilst the sidebar is open
document.body.addEventListener('keyup', e => {
  const hasSidebar = !!document.querySelector(".sanita-sidebar");
  if ( hasSidebar && e.keyCode === 27) closeSidebar(); // ESC
});