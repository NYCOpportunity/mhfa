let package = require('../package.json');
let services = require('./services');
let banners = require('./banners');
let substanceAbuse = require('./substance-abuse');
let about = require('./about');
let population = require('./population.json');

let remotes = {
  development: '',
  testing: 'https://nycopportunity.github.io/mhfa',
  production: package.homepage,
};

services.map(s => {
  s.banner = banners[s.title];

  s.body.substanceAbuse = substanceAbuse;

  s.body.substanceAbuse.content = substanceAbuse.content
    .replace('{{ this.root }}', remotes[process.env.NODE_ENV]);

  return s;
});

module.exports = {
  name: package.nicename,
  description: package.description,
  process: {
    env: {
      NODE_ENV: process.env.NODE_ENV,
    },
  },
  root: remotes[process.env.NODE_ENV],
  services: services,
  serviceSectionLabels: {
    whatItIs: {
      label: 'What it is',
      color: 'orange'
    },
    whoItIsFor: {
      label: 'Who it’s for',
      color: 'magenta'
    },
    cost: {
      label: 'Cost',
      color: 'blue'
    },
    howToGetInTouch: {
      label: 'How to get in touch',
      color: 'red'
    },
    otherWaysToGetHelp: {
      label: 'Other ways to get help',
      color: 'yellow'
    }
  },
  programs: [
    'Trauma Support',
    'Veterans',
    'Children and Families',
    'LGBTQ New Yorkers',
    'Care for Serious Mental Illness',
    'Crisis Support',
    'Aging New Yorkers',
    'Grief Support',
    'Help with Anxiety',
    'Substance Use Services',
  ],
  population: population,
  about: about,
  generateClassName: (title) => {
    let className = `bg-${title.toLowerCase()}--secondary`;
    return className;
  },
  createSlug: (s) =>
    s
      .toLowerCase()
      .replace(/[^0-9a-zA-Z - _]+/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-'),
};
