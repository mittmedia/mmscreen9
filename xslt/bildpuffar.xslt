<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:media="http://search.yahoo.com/mrss/" version="1.0">
<xsl:output encoding="utf-8" method="html" omit-xml-declaration="yes"></xsl:output>
<xsl:template match="/">

<div class="picsearchTeasers">

<xsl:for-each select="rss/channel/item">
<!--  Amount of entries you want // -->
<xsl:if test="(position()) &lt;= 4">

<div class="picsearchTeaser teaser-{position()}">
	<div class="imageTeaser">
		<a href="{link}"><img src="{media:thumbnail/@url}"></img></a>
	</div>
	<div class="textTeaser">
		<h3><span>TV:</span> <a href="{link}"><xsl:value-of select="title"></xsl:value-of></a></h3>
		<div class="richText">
			<a href="{link}"><p><xsl:value-of select="description"></xsl:value-of></p></a>
		</div>
	</div>
</div>

</xsl:if>
</xsl:for-each>

</div>

</xsl:template>
</xsl:stylesheet>