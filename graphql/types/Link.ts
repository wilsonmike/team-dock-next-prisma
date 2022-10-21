import { objectType, extendType, intArg, stringArg, nonNull } from 'nexus';
import { User } from './User';

export const Link = objectType({
    name: 'Link',
    definition(t) {
        t.string('id');
        t.string('title');
        t.string('url');
        t.string('description');
        t.string('imageUrl');
        t.string('category');
        t.list.field('users', {
            type: User,
            async resolve(parent, _args, ctx) {
                return await ctx.prisma.link
                    .findUnique({
                        where: {
                            id: parent.id,
                        },
                    })
                    .users();
            },
        });
    },
});

export const Edge = objectType({
    name: 'Edge',
    definition(t) {
        t.string('cursor');
        t.field('node', {
            type: Link,
        });
    },
});

export const PageInfo = objectType({
    name: 'PageInfo',
    definition(t) {
        t.string('endCursor');
        t.boolean('hasNextPage');
    },
});

export const Response = objectType({
    name: 'Response',
    definition(t) {
        t.field('pageInfo', { type: PageInfo } );
        t.list.field('edges', {
            type: Edge,
        });
    },
});

export const LinksQuery = extendType({
    type: 'Query',
    definition(t) {
        t.field('links', {
            type: 'Response',
            args: {
                first: intArg(),
                after: stringArg(),
            },
            async resolve(_, args, ctx) {
                let queryResults = null
                if (args.after) {
                    queryResults = await ctx.prisma.link.findMany({
                        take: args.first,
                        skip: 1,
                        cursor: {
                            id: args.after,
                        },
                    })
                } else {
                    queryResults = await ctx.prisma.link.findMany({
                        take: args.first,
                    })
                }
                if (queryResults.length > 0) {
                    const lastLinkInResults = queryResults[queryResults.length - 1];
                    const myCursor = lastLinkInResults.id;

                    const secondQueryResults = await ctx.prisma.link.findMany({
                        take: args.first,
                        cursor: {
                            id: myCursor,
                        },
                    })
                    const result = {
                        pageInfo: {
                            endCursor: myCursor,
                            hasNextPage: secondQueryResults.length >= args.first,
                        },
                        edges: queryResults.map(link => ({
                            cursor: link.id,
                            node: link,
                        })),
                    }
                    return result
                }
                return {
                    pageInfo: {
                        endCursor: null,
                        hasNextPage: false,
                    },
                    edges: [],
                };
            },
        });
    },
});

// mutation to create auth protected pages
export const CreateLinkMutation = extendType({
    type: 'Mutation',
    definition(t) {
        t.nonNull.field('createLink', {
            type: Link,
            args: {
                title: nonNull(stringArg()),
                url: nonNull(stringArg()),
                imageUrl: nonNull(stringArg()),
                category: nonNull(stringArg()),
                description: nonNull(stringArg()),
            }, 
            async resolve(_parent, args, ctx) {
                if (!ctx.user) {
                    throw new Error(`You need to be logged in to perform an action`)
                }

                const newLink = {
                    title: args.title,
                    url: args.url,
                    imageUrl: args.imageUrl,
                    category: args.category,
                    description: args.description,
                }

                return await ctx.prisma.link.create({
                    data: newLink,
                })
            }
        })
    }
})