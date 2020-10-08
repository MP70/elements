import { ITableOfContents as UiKitITableOfContents, TableOfContents as UIKitTableOfContents } from '@stoplight/ui-kit';
import * as React from 'react';
import { Client, Provider, useQuery } from 'urql';

import { TableOfContentsSkeleton } from '../components/TableOfContents/Skeleton';
import { defaultPlatformUrl } from '../constants';
import { useTocContents } from '../hooks/useTocContents';
import { useUrqlClient } from '../hooks/useUrqlClient';
import { ITableOfContentsTree, TableOfContentsLinkWithId } from '../types';

export type ITableOfContents<E> = {
  workspaceSlug: string;
  projectSlug: string;
  platformUrl?: string;
  branchSlug?: string;
  nodeUri?: string;
  onData?: (tocTree: ITableOfContentsTree) => void;
  className?: string;
} & Pick<UiKitITableOfContents<TableOfContentsLinkWithId, E>, 'rowComponent' | 'rowComponentExtraProps'>;

const tocQuery = `
query ProjectTableOfContents(
  $workspaceSlug: String!
  $projectSlug: String!
  $branchSlug: String
) {
  projectTableOfContents(projectSlug: $projectSlug, workspaceSlug: $workspaceSlug, branchSlug: $branchSlug) {
    data
    id
  }
}
`;

function TableOfContentsContainer<E>({
  workspaceSlug,
  platformUrl,
  projectSlug,
  branchSlug,
  nodeUri,
  onData,
  className,
  ...extra
}: ITableOfContents<E>) {
  const [{ data, fetching }] = useQuery({
    query: tocQuery,
    variables: {
      workspaceSlug,
      projectSlug,
      branchSlug: branchSlug !== '' ? branchSlug : void 0, // needed as empty string branch returns error
    },
  });
  const tocData = data?.projectTableOfContents?.data;

  React.useEffect(() => {
    if (tocData) {
      onData?.(tocData);
    }
  }, [onData, tocData]);

  const tree: ITableOfContentsTree = tocData ?? { items: [] };

  const contents: TableOfContentsLinkWithId[] = useTocContents(tree).map(item => {
    return {
      ...item,
      isActive: item.type === 'item' && nodeUri !== void 0 ? item.to === nodeUri : false,
    };
  });

  if (fetching) {
    return <TableOfContentsSkeleton className={className} />;
  }

  // any: unfortunately the typings for extra props break for some reason. Can't seem to figure out why, but I believe the behavior is valid.
  return <UIKitTableOfContents className={className} contents={contents} {...(extra as any)} />;
}

type TableOfContentsContainerProps<E> = ITableOfContents<E> & {
  urqlClient?: Client;
};

export function TableOfContents<E>({ platformUrl, urqlClient, ...rest }: TableOfContentsContainerProps<E>) {
  const client = useUrqlClient(`${platformUrl ?? defaultPlatformUrl}/graphql`, { urqlClient });
  return (
    <Provider value={client}>
      <TableOfContentsContainer platformUrl={platformUrl} {...rest} />
    </Provider>
  );
}
