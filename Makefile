.PHONY: build build-en build-ja clean serve

MDBOOK := mdbook
WEBSITE_DIR := website

EN_SOURCES := $(shell find en/src -type f) en/book.toml
JA_SOURCES := $(shell find ja/src -type f) ja/book.toml
THEME_SOURCES := $(shell find theme -type f) $(shell find js -type f)

build: build-en build-ja $(WEBSITE_DIR)/index.html

build-en: $(EN_SOURCES) $(THEME_SOURCES)
	cd en && $(MDBOOK) build

build-ja: $(JA_SOURCES) $(THEME_SOURCES)
	cd ja && $(MDBOOK) build

$(WEBSITE_DIR)/index.html: index.html
	@mkdir -p $(WEBSITE_DIR)
	cp index.html $(WEBSITE_DIR)/index.html

clean:
	rm -rf $(WEBSITE_DIR)/en $(WEBSITE_DIR)/ja $(WEBSITE_DIR)/index.html

serve: build
	@echo "Serving at http://localhost:8000/"
	cd $(WEBSITE_DIR) && npx serve . -l 8000
