import React, { useRef, useEffect, useState } from "react";
import {
  canUseDOM,
  twLoad,
  useShallowCompareMemoize,
  removeChildrenWithAttribute,
  twWidgetFactory,
  cloneShallow,
  twEventsFactory
} from "./utils";

if (canUseDOM) {
  twLoad();
}

const childDivIdentifyingAttribute = "twdiv";

function useTwitterWidget(factoryFunctionName, primaryArg, options, onLoad) {
  const [error, setError] = useState(null);

  const ref = useRef(null);

  // noop if ssr
  if (!canUseDOM) {
    return { ref, error };
  }

  // Make deps for useEffect.
  // options, and possibly primaryArg, are objects that should be compared (shallow).
  // There currently aren't any nested arrays or objects, so they
  // can be cloned in a shallow manner.
  // NOTE onLoad is used in useCallback, but it is not listed as a dependency.
  // Listing it would likely cause unnecessary loads. The latest onLoad should be
  // used regardless, since it will not be called unless the other dependencies
  // change, so it works out.
  const deps = [
    factoryFunctionName,
    useShallowCompareMemoize(primaryArg),
    useShallowCompareMemoize(options)
  ];

  useEffect(() => {
    // Reset error
    setError(null);

    // Protect against race conditions
    // (set to true in cleanup function;
    // checked if canceled in async loadWidget)
    let isCanceled = false;

    if (ref.current) {
      removeChildrenWithAttribute(ref.current, childDivIdentifyingAttribute);

      async function loadWidget() {
        if (!ref || !ref.current) {
          return;
        }

        const childEl = document.createElement("div");
        childEl.setAttribute(childDivIdentifyingAttribute, "yes");
        ref.current.appendChild(childEl);

        try {
          const wf = await twWidgetFactory();

          // primaryArg (possibly an object) and options must be cloned
          // since twitter mutates them (gah!).
          // There currently aren't any nested arrays or objects, so they
          // can be cloned in a shallow manner.
          const resultMaybe = await wf[factoryFunctionName](
            cloneShallow(primaryArg),
            childEl,
            cloneShallow(options)
          );

          // Twitter returns undefined if widget creation fails.
          // However, if deps are stale (isCanceled), suppress error (likely race condition).
          if (!resultMaybe && !isCanceled) {
            throw new Error(
              "Twitter could not create widget. If it is a Timeline or " +
              "Tweet, ensure the screenName/tweetId exists."
            );
          }
        } catch (e) {
          console.error(e);
          setError(e);
          return;
        }

        if (!ref || !ref.current) {
          return;
        }

        if (isCanceled) {
          if (childEl) {
            childEl.remove();
          }
          return;
        }

        if (onLoad) {
          onLoad();
        }
      }

      loadWidget();
    }

    return () => {
      isCanceled = true;
    };
  }, deps);

  return { ref, error };
}

const HANDLERS = {
  tweet: {},
  retweet: {},
  like: {}
}

const BASE_HANDLERS = {
  tweet: (intent) => {
    const handler = HANDLERS.tweet[intent.data.tweet_id];
    if (!handler) {
      return;
    }

    handler();
  },
  retweet: (intent) => {
    const handler = HANDLERS.retweet[intent.data.source_tweet_id];
    if (!handler) {
      return;
    }

    handler();
  },
  like: (intent) => {
    const handler = HANDLERS.like[intent.data.tweet_id];
    if (!handler) {
      return;
    }

    handler();
  }
}


function useTwitterEvents(id, { onTweet, onRetweet, onLike }) {
  useEffect(() => {
    async function loadEvents() {
      const events = await twEventsFactory();
      // Bind it once on load
      events.bind('tweet', BASE_HANDLERS.tweet);
      events.bind('retweet', BASE_HANDLERS.retweet);
      events.bind('like', BASE_HANDLERS.like);
    }

    loadEvents();
  }, [])

  useEffect(() => {
    if (!onTweet || !id) {
      return;
    }

    HANDLERS.tweet[id] = onTweet
  }, [id, onTweet])

  useEffect(() => {
    if (!onRetweet || !id) {
      return;
    }

    HANDLERS.retweet[id] = onRetweet
  }, [id, onRetweet])

  useEffect(() => {
    if (!onLike || !id) {
      return;
    }

    HANDLERS.like[id] = onLike
  }, [id, onLike])
}

export const Follow = ({ username, options, onLoad, renderError }) => {
  const { ref, error } = useTwitterWidget(
    "createFollowButton",
    username,
    options,
    onLoad
  );
  return <div ref={ref}>{error && renderError && renderError(error)}</div>;
};

export const Hashtag = ({ hashtag, options, onLoad, renderError }) => {
  const { ref, error } = useTwitterWidget(
    "createHashtagButton",
    hashtag,
    options,
    onLoad
  );
  return <div ref={ref}>{error && renderError && renderError(error)}</div>;
};

export const Mention = ({ username, options, onLoad, renderError }) => {
  const { ref, error } = useTwitterWidget(
    "createMentionButton",
    username,
    options,
    onLoad
  );
  return <div ref={ref}>{error && renderError && renderError(error)}</div>;
};

export const Share = ({ url, options, onLoad, renderError }) => {
  const { ref, error } = useTwitterWidget(
    "createShareButton",
    url,
    options,
    onLoad
  );
  return <div ref={ref}>{error && renderError && renderError(error)}</div>;
};

export const Timeline = ({ dataSource, options, onLoad, renderError }) => {
  const { ref, error } = useTwitterWidget(
    "createTimeline",
    dataSource,
    options,
    onLoad
  );
  return <div ref={ref}>{error && renderError && renderError(error)}</div>;
};

export const Tweet = ({ tweetId, options, onLoad, onLike, onTweet, onRetweet, renderError }) => {
  const { ref, error } = useTwitterWidget(
    "createTweet",
    tweetId,
    options,
    onLoad
  );

  useTwitterEvents(tweetId, { onLike, onTweet, onRetweet });

  return <div ref={ref}>{error && renderError && renderError(error)}</div>;
};
