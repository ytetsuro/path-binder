/**
 * Playground Loader — Detects .playground divs and generates StackBlitz iframes.
 *
 * Not using CodeSandbox:
 * The define API requires lz-string compression, which cannot work without an external library.
 *
 * Not using React Sandpack component:
 * mdbook generates static HTML; adding the React runtime would bloat the bundle size.
 *
 * Choosing StackBlitz:
 * A simple form POST is enough for iframe embedding. No API key or setup required.
 */
(function () {
  'use strict';

  var STACKBLITZ_RUN_URL = 'https://stackblitz.com/run';

  /**
   * Extracts file entries from data attributes on the .playground div.
   * Each [data-file-<name>] attribute holds a file path,
   * and the corresponding <pre><code> block holds the content.
   *
   * Not using a single code block approach:
   * Multiple files (index.html, index.ts) are needed for browser-based D&D.
   * data attributes let Markdown authors define multi-file projects declaratively.
   */
  function extractFiles(container) {
    var files = {};
    var codeBlocks = container.querySelectorAll('pre code');
    var fileNames = (container.getAttribute('data-files') || '').split(',');

    Array.prototype.forEach.call(codeBlocks, function (codeEl, i) {
      var fileName = (fileNames[i] || '').trim();
      if (!fileName) {
        return;
      }
      files[fileName] = codeEl.textContent || '';
    });

    return files;
  }

  /**
   * Helper to create a hidden input element.
   */
  function createHiddenInput(name, value) {
    var input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    return input;
  }

  /**
   * Builds a StackBlitz POST form and submits it into an iframe.
   *
   * Not using StackBlitz SDK (@stackblitz/sdk):
   * The SDK is an npm package and would require a CDN load for a static mdbook site.
   * A form POST achieves the same result with zero dependencies.
   */
  function createStackBlitzEmbed(files, options) {
    var template = options.template || 'node';
    var entryFile = options.entryFile || 'index.ts';
    var deps = options.dependencies || {};
    var devDeps = options.devDependencies || {};

    var wrapper = document.createElement('div');
    wrapper.className = 'playground-container';

    var iframe = document.createElement('iframe');
    iframe.name = 'stackblitz-' + Math.random().toString(36).slice(2, 8);
    iframe.style.width = '100%';
    iframe.style.height = '500px';
    iframe.style.border = '1px solid #dadce0';
    iframe.style.borderRadius = '8px';
    iframe.title = 'StackBlitz';

    var form = document.createElement('form');
    form.method = 'POST';
    // Not using view=editor: it hides the preview pane, making HTML output invisible.
    form.action = STACKBLITZ_RUN_URL + '?embed=1&file=' + encodeURIComponent(entryFile);
    form.target = iframe.name;
    form.style.display = 'none';

    form.appendChild(createHiddenInput('project[title]', 'path-binder playground'));
    form.appendChild(createHiddenInput('project[template]', template));

    // Add project files
    Object.keys(files).forEach(function (fileName) {
      form.appendChild(createHiddenInput('project[files][' + fileName + ']', files[fileName]));
    });

    // Add package.json if not provided.
    // Not using a bare package.json without scripts:
    // StackBlitz node template requires a "dev" script to serve HTML via Vite.
    if (!files['package.json']) {
      form.appendChild(createHiddenInput('project[files][package.json]', JSON.stringify({
        name: 'path-binder-playground',
        private: true,
        type: 'module',
        scripts: { dev: 'vite' },
        dependencies: deps,
        devDependencies: devDeps,
      }, null, 2)));
    }

    // Add tsconfig.json if not provided
    if (!files['tsconfig.json']) {
      form.appendChild(createHiddenInput('project[files][tsconfig.json]', JSON.stringify({
        compilerOptions: {
          module: 'ESNext',
          moduleResolution: 'bundler',
          target: 'ES2022',
          strict: true,
          esModuleInterop: true,
          jsx: 'react-jsx',
        },
      }, null, 2)));
    }

    wrapper.appendChild(iframe);
    wrapper.appendChild(form);

    return { wrapper: wrapper, form: form };
  }

  /**
   * Scans all .playground divs on the page and inserts StackBlitz iframes.
   */
  function initPlaygroundElements() {
    var containers = document.querySelectorAll('.playground');
    Array.prototype.forEach.call(containers, function (container) {
      var files = extractFiles(container);
      if (Object.keys(files).length === 0) {
        return;
      }

      var deps = {};
      var devDeps = {};
      try { deps = JSON.parse(container.getAttribute('data-dependencies') || '{}'); } catch (e) { /* ignore */ }
      try { devDeps = JSON.parse(container.getAttribute('data-dev-dependencies') || '{}'); } catch (e) { /* ignore */ }

      // Hide source code blocks after extraction.
      // Not removing them from DOM: extractFiles() already read their content,
      // but removing could break mdbook's own scripts that reference them.
      var pres = container.querySelectorAll('pre');
      Array.prototype.forEach.call(pres, function (pre) {
        pre.style.display = 'none';
      });

      var embed = createStackBlitzEmbed(files, {
        template: container.getAttribute('data-template') || 'node',
        entryFile: container.getAttribute('data-entry') || 'index.ts',
        dependencies: deps,
        devDependencies: devDeps,
      });
      container.appendChild(embed.wrapper);

      // Submit the form after appending to DOM (iframe target must exist in DOM)
      embed.form.submit();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlaygroundElements);
  } else {
    initPlaygroundElements();
  }
})();
