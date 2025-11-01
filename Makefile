.PHONY: zip-backup
zip-backup: ## Create a zip archive of all git-tracked files with a timestamped name
	@ARCHIVE=costscope-backstage-plugin-backup-`date +%F`.zip; \
	git ls-files | zip -@ $$ARCHIVE; \
	echo "Created $$ARCHIVE with all git-tracked files."
