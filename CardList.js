"use strict";

// sets_json has keys ["Base Set", "Promos", "Bandits of Black Rock", ...]
// entries are objects with the "Quest Number" and each card type ("Heroes" etc)
// Each card type entry is an array of card names
// (in JSON to protect)
let sets_json;

let cards_json; // array of all cards (in JSON to protect)
let getCard; // function to retreive a card from the catalogue as an Object

// enums for translating html IDs to database keys
// and for interface colours
let enums; // keys ["ids", "color"], with corresponding enums keyed by html IDs

$(function(){
  // Load the list of sets and their contents
  $.getJSON("sets.json", function(data){
    sets_json = JSON.stringify(data);
    console.debug("Sets loaded:", data);
  }).fail(function() {
    console.error("Could not load sets from file 'sets.json'");
  });

  // Initialize the card database
  $.getJSON("cards.json",function(data){
    cards_json = JSON.stringify(data);
    let db = {};
    data.forEach(function(card){
      db[card.Name] = JSON.stringify(card);
    });
    getCard = function(card){
      return JSON.parse(db[card]);
    };
  }).fail(function(){
    console.error("Could not load cards from file 'cards.json'");
  });

  // Get some stuff to help with the UI
  $.getJSON("enums.json",function(data){
    enums = data;
  }).fail(function(){
    throw new Error("Could not load UI enums from file 'enums.json'");
  });
});

// CardList is a class; calling "new CardList()" will get a fresh card list,
//  with all cards indexed by name
function CardList(source_CardList) {
  if(this.constructor !== CardList) return new CardList(source_CardList);

  let that = this;

  let cards = {};
  let filters = []; // Filter functions where false = exclude
  let exclude = []; // Filter functions where true = exclude

  if (source_CardList) {
    if(source_CardList.constructor === CardList) return source_CardList.copy();
    else if(Array.isArray(source_CardList)) addCard(source_CardList);
    else addCard(Object.keys(JSON.parse(cards_json)));
  } else addCard(Object.keys(JSON.parse(cards_json)));

  function addCard(card){
    if(!card);
    else if(typeof card === "string") cards[card] = true;
    else if(typeof card === "function") Object.keys(cards).forEach(function(name){
      if(card(getCard(name))) cards[name] = false;
    });
    else if(typeof card !== "object");
    else if(typeof card.Name === "string") addCard(card.name);
    else if(Array.isArray(card)) card.forEach(addCard);
    return that;
  }

  function removeCard(card){
    if(!card);
    else if(typeof card === "string") delete cards[card];
    else if(typeof card === "function") Object.keys(cards).forEach(function(name){
      if(card(getCard(name))) delete cards[name];
    });
    else if(typeof card !== "object");
    else if(Array.isArray(card)) card.forEach(removeCard);
    else if(typeof card.Name === "string") removeCard(card.name);
    return that;
  }

  function validateCard(card){
    if(!card);
    else if(typeof card === "string") cards[card] = true;
    else if(typeof card === "function") Object.keys(cards).forEach(function(name){
      if(card(getCard(name))) validateCard(name);
    });
    else if(typeof card !== "object");
    else if(Array.isArray(card)) card.forEach(validateCard);
    else if(typeof card.Name === "string") validateCard(card.name);
    return that;
  }

  function invalidateCard(card){
    if(!card);
    else if(typeof card === "string") cards[card] = false;
    else if(typeof card === "function") that.names.forEach(function(name){
      if(card(getCard(name))) invalidateCard(name);
    });
    else if(typeof card !== "object");
    else if(Array.isArray(card)) card.forEach(invalidateCard);
    else if(typeof card.Name === "string") invalidateCard(card.name);
    return that;
  }

  // @arg A card name, card object, function that filters card objects, or list of any of those
  // If the argument is a filter function, it only filters on cards that have not been removed
  // by the "remove" function.
  Object.defineProperty(that,"add",{value:addCard});
  Object.defineProperties(that,"remove",{value:removeCard});
  Object.defineProperty(that,"validate",{value:validateCard});
  Object.defineProperty(that,"invalidate",{value:invalidateCard});

  Object.defineProperty(that,"addFilter",{
    value: function(filter,exclude){
      if(exclude === true) {
        if(exclude.indexOf(filters) === -1) exclude.push(filter);
      } else {
        if(filter.indexOf(filters) === -1) filters.push(filter);
      }
    return that;
    }
  });

  Object.defineProperty(that,"removeFilter",{
    value: function(filter,exclude){
      if(exclude === true) {
        if(exclude.indexOf(filters) === -1) exclude.push(filter);
      } else {
        if(filter.indexOf(filters) === -1) filters.push(filter);
      }
    return that;
    }
  });

  Object.defineProperty(that,"getNames",{
    value: function(){
      let names = Object.keys(cards).filter(function(card){
        return cards[card];
      });

      filters.forEach(function(filter){
        names = names.filter(filter);
      });

      exclude.forEach(function(filter){
        names = names.filter(function(name){
          return !filter(name);
        });
      });
    }
  });

  Object.defineProperty(that,"names",{
    get: that.getNames
  });

  Object.defineProperty(that,"getCards",{
    value: function(){return that.names.map(getCard);}
  });

  Object.defineProperty(that,"cards",{
    get: that.getCards
  });

  Object.defineProperty(that,"isValid",{
    value: function(card){
      if(typeof card === "object") card = card.Name;
      return !!cards[card];
    }
  });

  Object.defineProperty(that,"copy",{
    value: function(){
      let copy = new CardList(Object.keys(cards));
      copy.addFilter(filters);
      copy.addFilter(exclude,true);
      copy.invalidate(Object.keys(cards).filter(function(name){return !cards[name];}));
      return copy;
    }
  });

  Object.defineProperties(that,{
    heroes: {
      get: function(){
        return that.names.filter(function(card){return getCard(card).Category === "Heroes";});
      }
    },
    monsters: {
      get: function(){
        return that.names.filter(function(card){return getCard(card).Category === "Monsters";});
      }
    },
    rooms: {
      get: function(){
        return that.names.filter(function(card){return getCard(card).Category === "Dungeon Rooms";});
      }
    },
    market: {
      get: function(){
        return that.names.filter(function(card){
          return ["Items","Spells","Weapons"].indexOf(getCard(card).Category) !== -1;
        });
      }
    },
    items: {
      get: function(){
        return that.names.filter(function(card){return getCard(card).Category === "Items";});
      }
    },
    spells: {
      get: function(){
        return that.names.filter(function(card){return getCard(card).Category === "Spells";});
      }
    },
    weapons: {
      get: function(){
        return that.names.filter(function(card){return getCard(card).Category === "Weapons";});
      }
    },
    guardians: {
      get: function(){
        return that.names.filter(function(card){return getCard(card).Category === "Guardians";});
      }
    },
    treasures: {
      get: function(){
        return that.names.filter(function(card){return getCard(card).Category === "Treasures";});
      }
    },
    quests: {
      get: function(){
        return that.names.filter(function(card){return getCard(card).Category === "Side Quests";});
      }
    },
    guilds: {
      get: function(){
        return that.names.filter(function(card){return getCard(card).Category === "Guild Sponsorships";});
      }
    },
    classes: {
      get: function(){
        return that.names.filter(function(card){return getCard(card).Category === "Prestige Classes";});
      }
    }
  });
}

export {CardList};