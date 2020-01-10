const SANITA_ID = "30f961e345f4894df1bd0e961a";
const SANITA_AVATAR = "https://tc.tradersclub.com.br/api/v4/users/30f961e345f4894df1bd0e961a/image?_=1561491021660";

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
}

const fetchPosts = async () => {
  const response = await fetchResource(`https://tc.tradersclub.com.br/api/v4/channels/ggn6rok18igcpm67n8iomdkb8h/posts?page=0&per_page=100`, {
      method: "GET",
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin':'*',
        'Authorization': `Bearer ${localStorage.getItem("token")}`
      },
    });

  const { order, posts } = await response.json();
  const postsBySanita = []
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
  const strong = document.createElement("strong");
  strong.textContent = "Pesquise antes de solicitar uma nova análise.";
  paragraph.textContent = "Clique no ticker para ver a análise mais recente sobre o ativo ou passe o mouse sobre a linha para ler o comentário. ";
  paragraph.appendChild(strong);
  sidebar.appendChild(paragraph);
  const rule = document.createElement('hr');
  sidebar.appendChild(rule);

  // Add list of tickers
  const list = document.createElement('ul');
  postsBySanita.forEach((post) => {
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
    item.appendChild(div)
    list.appendChild(item)
  })
  sidebar.appendChild(list)

  // Add elements to the DOM
  container.appendChild(sidebar)
  container.insertAdjacentElement("beforeend", sidebar);
}

// Create launch button only after the header is rendered
document.arrive('.render-search-box', {}, function() {
  const searchBoxContainer = document.querySelector('.render-search-box');
  const button = document.createElement('button');
  button.classList = "sanita-button";
  const image = document.createElement("img");
  image.src = SANITA_AVATAR;
  button.appendChild(image);
  button.onclick = fetchPosts;
  searchBoxContainer.insertBefore(button, searchBoxContainer.firstChild);
});

// Add a listener to close the sidebar if user presses ESC whilst the sidebar is open
document.body.addEventListener('keyup', e => {
  const hasSidebar = !!document.querySelector(".sanita-sidebar");
  if ( hasSidebar && e.keyCode === 27) closeSidebar(); // ESC
});