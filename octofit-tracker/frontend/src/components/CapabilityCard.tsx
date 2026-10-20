import { useEffect, useState, type ReactNode } from 'react';

type Props<T> = {
  title: string;
  description: string;
  emptyText: string;
  load: () => Promise<T[]>;
  renderItem: (item: T) => ReactNode;
};

export function CapabilityCard<T>({ title, description, emptyText, load, renderItem }: Props<T>) {
  const [items, setItems] = useState<T[]>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    load().then((result) => {
      if (active) setItems(result);
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => {
      active = false;
    };
  }, [load]);

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">{title}</h2>
    <p>{description}</p>
    {items === undefined && !failed && <p role="status">Loading {title.toLowerCase()}...</p>}
    {failed && <p role="alert">Unable to load {title.toLowerCase()}. Please try again later.</p>}
    {items?.length === 0 && <p>{emptyText}</p>}
    {items && items.length > 0 && <ul className="list-group list-group-flush">
      {items.map((item, index) => <li className="list-group-item" key={index}>{renderItem(item)}</li>)}
    </ul>}
  </div></section>;
}
