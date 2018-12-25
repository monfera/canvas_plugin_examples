export default function(kibana) {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch', 'xpack_main', 'interpreter', 'canvas'],
    name: 'canvas_demo',

    uiExports: {
      // This is the bit that exposes the `public/index.js` file to Canvas
      canvas: ['plugins/canvas_demo'],
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server) {
      const { register } = server.plugins.interpreter;
      register({
        serverFunctions: [
          () => ({
            name: 'serverTime',
            help: 'Get the server time in milliseconds',
            args: {},
            fn() {
              return Date.now();
            },
          }),
        ],
      });
    },
  });
}
